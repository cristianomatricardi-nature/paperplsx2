import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  // Validate API key
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return json({ error: "Missing API key" }, 401);
  }

  const rawKey = authHeader.replace("Bearer ", "");

  // Hash the key
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(rawKey));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const keyHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

  // Look up key
  const { data: keyRow } = await supabase
    .from("paper_api_keys")
    .select("id, user_id")
    .eq("api_key_hash", keyHash)
    .single();

  if (!keyRow) {
    return json({ error: "Invalid API key" }, 401);
  }

  // Update last_used_at
  await supabase
    .from("paper_api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", keyRow.id);

  // Parse query params
  const url = new URL(req.url);
  const paperId = url.searchParams.get("paper_id");
  const moduleId = url.searchParams.get("module");
  const wantSummary = url.searchParams.get("summary") === "true";

  if (!paperId) {
    return json({ error: "paper_id query parameter is required" }, 400);
  }

  const numericPaperId = Number(paperId);
  if (isNaN(numericPaperId)) {
    return json({ error: "paper_id must be a number" }, 400);
  }

  // Fetch paper
  const { data: paper, error: paperErr } = await supabase
    .from("papers")
    .select("*")
    .eq("id", numericPaperId)
    .single();

  if (paperErr || !paper) {
    return json({ error: "Paper not found" }, 404);
  }

  // If requesting a specific module's content
  if (moduleId) {
    const { data: content } = await supabase
      .from("generated_content_cache")
      .select("content, content_type, source_chunks, created_at")
      .eq("paper_id", numericPaperId)
      .eq("module_id", moduleId)
      .eq("persona_id", "ai_agent")
      .single();

    return json({
      paper_id: numericPaperId,
      module: moduleId,
      persona: "ai_agent",
      content: content?.content ?? null,
      source_chunks: content?.source_chunks ?? [],
      generated_at: content?.created_at ?? null,
    });
  }

  // If requesting summary
  if (wantSummary) {
    const { data: summary } = await supabase
      .from("generated_content_cache")
      .select("content, created_at")
      .eq("paper_id", numericPaperId)
      .eq("content_type", "summary")
      .eq("persona_id", "ai_agent")
      .single();

    return json({
      paper_id: numericPaperId,
      persona: "ai_agent",
      summary: summary?.content ?? null,
      generated_at: summary?.created_at ?? null,
    });
  }

  // Default: return paper metadata + structured data
  const { data: structured } = await supabase
    .from("structured_papers")
    .select("*")
    .eq("paper_id", numericPaperId)
    .single();

  return json({
    paper_id: numericPaperId,
    title: paper.title,
    authors: paper.authors,
    journal: paper.journal,
    doi: paper.doi,
    abstract: paper.abstract,
    publication_date: paper.publication_date,
    status: paper.status,
    num_pages: paper.num_pages,
    structured: structured
      ? {
          sections: structured.sections,
          claims: structured.claims,
          methods: structured.methods,
          figures: structured.figures,
          negative_results: structured.negative_results,
          call_to_actions: structured.call_to_actions,
          scicomm_hooks: structured.scicomm_hooks,
          equations: structured.equations,
          tables_data: structured.tables_data,
          references_list: structured.references_list,
        }
      : null,
  });
});
