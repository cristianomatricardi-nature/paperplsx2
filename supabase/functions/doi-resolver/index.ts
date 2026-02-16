import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const unpaywallEmail = Deno.env.get("UNPAYWALL_EMAIL") || "user@example.com";

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!);
    const { data: { user }, error: authError } = await anonClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { doi } = await req.json();

    if (!doi || typeof doi !== "string") {
      return new Response(
        JSON.stringify({ error: "DOI is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Normalize DOI
    const normalizedDoi = doi
      .replace(/^https?:\/\/doi\.org\//i, "")
      .replace(/^doi:/i, "")
      .trim();

    // Query Unpaywall API
    const unpaywallUrl = `https://api.unpaywall.org/v2/${encodeURIComponent(normalizedDoi)}?email=${encodeURIComponent(unpaywallEmail)}`;
    const unpaywallRes = await fetch(unpaywallUrl);

    if (!unpaywallRes.ok) {
      return new Response(
        JSON.stringify({ success: false, error: `DOI not found or Unpaywall error (status ${unpaywallRes.status})` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const unpaywallData = await unpaywallRes.json();

    // Find best OA PDF URL
    let pdfUrl: string | null = null;

    if (unpaywallData.best_oa_location?.url_for_pdf) {
      pdfUrl = unpaywallData.best_oa_location.url_for_pdf;
    } else if (unpaywallData.oa_locations) {
      for (const loc of unpaywallData.oa_locations) {
        if (loc.url_for_pdf) {
          pdfUrl = loc.url_for_pdf;
          break;
        }
      }
    }

    if (!pdfUrl) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "No open-access PDF found for this DOI. Please upload the PDF manually.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Download PDF
    const pdfRes = await fetch(pdfUrl);
    if (!pdfRes.ok) {
      return new Response(
        JSON.stringify({ success: false, error: "Failed to download PDF from source" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const pdfBuffer = await pdfRes.arrayBuffer();
    const doiSlug = normalizedDoi.replace(/[^a-zA-Z0-9.-]/g, "_");
    const storagePath = `${user.id}/${doiSlug}.pdf`;

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from("research-papers")
      .upload(storagePath, pdfBuffer, {
        contentType: "application/pdf",
        upsert: false,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return new Response(
        JSON.stringify({ error: "Failed to upload PDF to storage" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract metadata from Unpaywall
    const title = unpaywallData.title || null;
    const authors = unpaywallData.z_authors
      ? unpaywallData.z_authors.map((a: any) => ({
          name: [a.given, a.family].filter(Boolean).join(" "),
          affiliation: a.affiliation?.[0]?.name || null,
          orcid: a.ORCID || null,
        }))
      : null;
    const journal = unpaywallData.journal_name || null;
    const publicationDate = unpaywallData.published_date || null;

    // Insert paper record
    const { data: paper, error: dbError } = await supabase
      .from("papers")
      .insert({
        user_id: user.id,
        doi: normalizedDoi,
        title,
        authors,
        journal,
        publication_date: publicationDate,
        source_type: "doi",
        storage_path: storagePath,
        file_size: pdfBuffer.byteLength,
        status: "uploaded",
      })
      .select("id")
      .single();

    if (dbError || !paper) {
      console.error("DB insert error:", dbError);
      await supabase.storage.from("research-papers").remove([storagePath]);
      return new Response(
        JSON.stringify({ error: "Failed to create paper record" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fire-and-forget: invoke orchestrate-pipeline
    try {
      fetch(`${supabaseUrl}/functions/v1/orchestrate-pipeline`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({ paper_id: paper.id }),
      });
    } catch (e) {
      console.warn("Failed to invoke orchestrate-pipeline (non-blocking):", e);
    }

    return new Response(
      JSON.stringify({ success: true, paper_id: paper.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
