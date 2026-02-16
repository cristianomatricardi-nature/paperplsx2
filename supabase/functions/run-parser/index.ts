import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as pdfjsLib from "https://esm.sh/pdfjs-dist@4.4.168/build/pdf.mjs";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  let paperId: number;
  try {
    const body = await req.json();
    paperId = body.paper_id;
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON or missing paper_id" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (!paperId) {
    return new Response(
      JSON.stringify({ error: "paper_id is required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    // 1. Fetch the paper record to get storage_path
    const { data: paper, error: fetchError } = await supabase
      .from("papers")
      .select("id, storage_path, status")
      .eq("id", paperId)
      .single();

    if (fetchError || !paper) {
      throw new Error(`Paper ${paperId} not found: ${fetchError?.message}`);
    }

    if (!paper.storage_path) {
      throw new Error(`Paper ${paperId} has no storage_path`);
    }

    // 2. Download the PDF from the "research-papers" storage bucket
    const { data: fileData, error: downloadError } = await supabase
      .storage
      .from("research-papers")
      .download(paper.storage_path);

    if (downloadError || !fileData) {
      throw new Error(`Failed to download PDF: ${downloadError?.message}`);
    }

    // 3. Parse PDF using pdfjs-dist
    const arrayBuffer = await fileData.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    const loadingTask = pdfjsLib.getDocument({
      data: uint8Array,
      useSystemFonts: true,
      disableFontFace: true,
    });
    const pdfDoc = await loadingTask.promise;

    const numPages = pdfDoc.numPages;
    const pageMap: Record<number, string> = {};
    let fullText = "";

    // 4. Build page_map: extract text for each page
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .filter((item: any) => "str" in item)
        .map((item: any) => item.str)
        .join(" ");

      pageMap[pageNum] = pageText;
      fullText += pageText + "\n";
    }

    // 5. Save parsed result to temporary storage file
    const parsedResult = {
      paper_id: paperId,
      num_pages: numPages,
      raw_text: fullText,
      page_map: pageMap,
    };

    const parsedJson = JSON.stringify(parsedResult);
    const parsedBlob = new Blob([parsedJson], { type: "application/json" });

    const { error: uploadError } = await supabase
      .storage
      .from("research-papers")
      .upload(`temp/${paperId}/parsed.json`, parsedBlob, {
        contentType: "application/json",
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Failed to upload parsed.json: ${uploadError.message}`);
    }

    // 6. Update papers.num_pages
    const { error: updateError } = await supabase
      .from("papers")
      .update({ num_pages: numPages, updated_at: new Date().toISOString() })
      .eq("id", paperId);

    if (updateError) {
      throw new Error(`Failed to update paper: ${updateError.message}`);
    }

    console.log(`[run-parser] Paper ${paperId}: Parsed ${numPages} pages, ${fullText.length} chars`);

    // 7. Return success
    return new Response(
      JSON.stringify({
        success: true,
        raw_text_length: fullText.length,
        num_pages: numPages,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error(`[run-parser] Paper ${paperId}: Failed:`, err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
