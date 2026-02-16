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
    const { paper_id, query } = await req.json();

    if (!paper_id || !query) {
      return new Response(
        JSON.stringify({ error: "paper_id and query are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiApiKey) throw new Error("OPENAI_API_KEY not set");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Embed the query
    const embeddingResponse = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: query,
      }),
    });

    if (!embeddingResponse.ok) {
      const errText = await embeddingResponse.text();
      throw new Error(`Embedding API error: ${embeddingResponse.status} ${errText}`);
    }

    const embeddingData = await embeddingResponse.json();
    const queryEmbedding = embeddingData.data[0].embedding;

    // 2. Match chunks
    const { data: chunks, error: matchError } = await supabase.rpc("match_chunks", {
      p_paper_id: paper_id,
      p_query_embedding: JSON.stringify(queryEmbedding),
      p_match_threshold: 0.3,
      p_match_count: 4,
    });

    if (matchError) throw new Error(`match_chunks failed: ${matchError.message}`);

    const passages = (chunks ?? []).map((c: any) => ({
      content: c.content,
      page_numbers: c.page_numbers,
      similarity: Math.round(c.similarity * 100) / 100,
    }));

    return new Response(JSON.stringify({ passages }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[explain-metric] Error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
