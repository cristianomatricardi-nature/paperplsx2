import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface Figure {
  id: string;
  caption: string;
  description: string;
  page_number: number;
  key_findings: string[];
  image_url?: string;
  bounding_box?: { x: number; y: number; width: number; height: number };
}

interface BoundingBoxResult {
  figure_id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Convert Uint8Array to base64 without stack overflow (chunked). */
function uint8ToBase64(bytes: Uint8Array): string {
  const CHUNK = 8192;
  let binary = "";
  for (let i = 0; i < bytes.length; i += CHUNK) {
    const slice = bytes.subarray(i, Math.min(i + CHUNK, bytes.length));
    for (let j = 0; j < slice.length; j++) {
      binary += String.fromCharCode(slice[j]);
    }
  }
  return btoa(binary);
}

/** Build the prompt listing all figure captions for bounding box detection. */
function buildPrompt(figures: Figure[], isRetry: boolean): string {
  const listing = figures
    .map((f, i) => `${i + 1}. figure_id="${f.id}" (page ${f.page_number}): "${f.caption}"`)
    .join("\n");

  const prefix = isRetry
    ? `You have been given an inline PDF document. You MUST analyze it. Do NOT refuse. Look at each page visually and identify where each figure is located.\n\n`
    : "";

  return `${prefix}You are analysing a scientific paper PDF that has been provided to you as an inline file. Examine each page of the PDF and locate the figures listed below.

For EACH figure, return the bounding box of the figure image (excluding the caption text) as fractional coordinates (0-1) relative to the page dimensions.

Figures:
${listing}

Return a JSON array (no markdown, no extra text) with one object per figure:
[
  { "figure_id": "fig_1", "x": 0.1, "y": 0.2, "width": 0.8, "height": 0.4 },
  ...
]

Rules:
- x,y = top-left corner as fraction of page width/height
- width,height = size as fraction of page width/height
- All values between 0 and 1
- If you cannot locate a figure, still include it with your best estimate based on the page layout
- Return ONLY the JSON array`;
}

/** Check if the raw text contains refusal phrases. */
function isRefusal(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    lower.includes("i'm unable") ||
    lower.includes("i cannot") ||
    lower.includes("i can't") ||
    lower.includes("unable to extract") ||
    lower.includes("cannot process")
  );
}

/** Parse bounding boxes from raw text response. */
function parseBoundingBoxes(rawText: string): Map<string, { x: number; y: number; width: number; height: number }> {
  const result = new Map<string, { x: number; y: number; width: number; height: number }>();
  try {
    const jsonStr = rawText.replace(/```json?\s*/g, "").replace(/```/g, "").trim();
    const parsed: BoundingBoxResult[] = JSON.parse(jsonStr);
    if (Array.isArray(parsed)) {
      for (const item of parsed) {
        if (
          item.figure_id &&
          typeof item.x === "number" &&
          typeof item.y === "number" &&
          typeof item.width === "number" &&
          typeof item.height === "number"
        ) {
          result.set(item.figure_id, {
            x: Math.max(0, Math.min(1, item.x)),
            y: Math.max(0, Math.min(1, item.y)),
            width: Math.max(0, Math.min(1, item.width)),
            height: Math.max(0, Math.min(1, item.height)),
          });
        }
      }
    }
  } catch (parseErr) {
    console.warn("Failed to parse bounding boxes JSON:", parseErr, "Raw:", rawText.slice(0, 500));
  }
  return result;
}

/** Call OpenAI Responses API with inline PDF and return parsed bounding boxes. Retries once on refusal. */
async function extractBoundingBoxes(
  openaiKey: string,
  pdfBase64: string,
  figures: Figure[],
): Promise<Map<string, { x: number; y: number; width: number; height: number }>> {
  for (const isRetry of [false, true]) {
    const prompt = buildPrompt(figures, isRetry);
    console.log(`[figure-extraction] Attempt ${isRetry ? 2 : 1}: sending request to OpenAI`);

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        input: [
          {
            role: "user",
            content: [
              { type: "input_text", text: prompt },
              {
                type: "input_file",
                file_data: `data:application/pdf;base64,${pdfBase64}`,
                filename: "paper.pdf",
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("OpenAI Responses API error:", response.status, errText);
      if (!isRetry) continue;
      return new Map();
    }

    const data = await response.json();
    const rawText: string = data.output_text
      ?? data.output?.[0]?.content?.[0]?.text
      ?? "";

    if (isRefusal(rawText)) {
      console.warn(`[figure-extraction] Model refused (attempt ${isRetry ? 2 : 1}):`, rawText.slice(0, 200));
      if (!isRetry) continue;
      return new Map();
    }

    const result = parseBoundingBoxes(rawText);
    if (result.size > 0 || isRetry) {
      return result;
    }
    // Empty result on first try — retry
    console.warn("[figure-extraction] Empty result on first attempt, retrying with stronger prompt");
  }

  return new Map();
}

/** Default full-page bounding box fallback. */
const FULL_PAGE_FALLBACK = { x: 0.05, y: 0.05, width: 0.9, height: 0.9 };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { paper_id } = await req.json();

    if (!paper_id) {
      return new Response(
        JSON.stringify({ error: "paper_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 1. Fetch figures from structured_papers
    const { data: sp, error: spErr } = await supabase
      .from("structured_papers")
      .select("figures")
      .eq("paper_id", paper_id)
      .single();

    if (spErr || !sp) {
      return new Response(
        JSON.stringify({ error: "Structured paper not found", details: spErr?.message }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const figures: Figure[] = (sp.figures as Figure[]) || [];

    if (figures.length === 0) {
      return new Response(
        JSON.stringify({ success: true, figures_extracted: 0, message: "No figures to extract" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 2. Fetch storage_path
    const { data: paper, error: paperErr } = await supabase
      .from("papers")
      .select("storage_path")
      .eq("id", paper_id)
      .single();

    if (paperErr || !paper?.storage_path) {
      return new Response(
        JSON.stringify({ error: "Paper or storage path not found", details: paperErr?.message }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 3. Download PDF
    const { data: pdfData, error: dlErr } = await supabase.storage
      .from("research-papers")
      .download(paper.storage_path);

    if (dlErr || !pdfData) {
      return new Response(
        JSON.stringify({ error: "Failed to download PDF", details: dlErr?.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 4. Extract bounding boxes via OpenAI Responses API
    let boundingBoxes = new Map<string, { x: number; y: number; width: number; height: number }>();

    if (openaiKey) {
      const pdfBytes = new Uint8Array(await pdfData.arrayBuffer());
      const pdfBase64 = uint8ToBase64(pdfBytes);
      console.log(`PDF encoded: ${pdfBytes.length} bytes -> ${pdfBase64.length} base64 chars`);

      boundingBoxes = await extractBoundingBoxes(openaiKey, pdfBase64, figures);
      console.log(`Bounding boxes detected: ${boundingBoxes.size}/${figures.length}`);
    } else {
      console.warn("OPENAI_API_KEY not set — skipping bounding box detection");
    }

    // 5. Update figures with bounding boxes (fallback to full-page for missing ones)
    const updatedFigures = figures.map((fig) => {
      const bb = boundingBoxes.get(fig.id);
      return {
        ...fig,
        bounding_box: bb ?? FULL_PAGE_FALLBACK,
      };
    });

    // 6. Save to structured_papers
    const { error: updateErr } = await supabase
      .from("structured_papers")
      .update({ figures: updatedFigures })
      .eq("paper_id", paper_id);

    if (updateErr) {
      console.error("Failed to update figures:", updateErr);
      return new Response(
        JSON.stringify({ error: "Failed to update figure metadata", details: updateErr.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        figures_extracted: boundingBoxes.size,
        figures_with_fallback: figures.length - boundingBoxes.size,
        total_figures: figures.length,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
