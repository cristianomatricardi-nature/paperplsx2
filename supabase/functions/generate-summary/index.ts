import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUB_PERSONA_REGISTRY } from "../_shared/sub-personas.ts";

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
  const openaiApiKey = Deno.env.get("OPENAI_API_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  let paperId: number;
  let subPersonaId: string;

  try {
    const body = await req.json();
    paperId = body.paper_id;
    subPersonaId = body.sub_persona_id;
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  if (!paperId || !subPersonaId) {
    return new Response(
      JSON.stringify({ error: "paper_id and sub_persona_id are required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // 1. Check cache
  const { data: cached } = await supabase
    .from("generated_content_cache")
    .select("content")
    .eq("paper_id", paperId)
    .eq("content_type", "summary")
    .eq("persona_id", subPersonaId)
    .maybeSingle();

  if (cached) {
    console.log(`[generate-summary] Cache hit for paper ${paperId}, persona ${subPersonaId}`);
    return new Response(
      JSON.stringify({ success: true, cached: true, content: cached.content }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // 2. Look up sub-persona
  const subPersona = SUB_PERSONA_REGISTRY[subPersonaId];
  if (!subPersona) {
    return new Response(
      JSON.stringify({ error: `Unknown sub_persona_id: ${subPersonaId}` }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  try {
    // 3. Create embedding for query
    const queryText = "Key findings and main contributions of this research paper";

    const embeddingResponse = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: queryText,
      }),
    });

    if (!embeddingResponse.ok) {
      const errText = await embeddingResponse.text();
      console.error("[generate-summary] Embedding API error:", embeddingResponse.status, errText);
      throw new Error(`Embedding API error: ${embeddingResponse.status}`);
    }

    const embeddingData = await embeddingResponse.json();
    const queryEmbedding = embeddingData.data[0].embedding;

    // 4. Match chunks via database function
    const { data: chunks, error: matchError } = await supabase.rpc("match_chunks", {
      p_paper_id: paperId,
      p_query_embedding: JSON.stringify(queryEmbedding),
      p_match_threshold: 0.5,
      p_match_count: 12,
    });

    if (matchError) {
      console.error("[generate-summary] match_chunks error:", matchError);
      throw new Error(`match_chunks failed: ${matchError.message}`);
    }

    if (!chunks || chunks.length === 0) {
      throw new Error("No matching chunks found for this paper");
    }

    // 5. Build prompt
    const contextText = chunks
      .map((c: { page_numbers: number[]; content: string }) =>
        `[Page ${c.page_numbers.join(",")}] ${c.content}`
      )
      .join("\n\n");

    const prompt = `You are generating a personalized summary of a scientific paper for a specific reader.

READER PROFILE:
- Role: ${subPersona.label}
- Pain Point: ${subPersona.painPoint}
- Quantitative Depth: ${subPersona.quantitativeDepth}
- Language Style: ${subPersona.languageStyle}

PAPER CONTEXT (retrieved from the paper):
${contextText}

TASK: Generate a "Key Insights" summary with exactly 4 bullet points. Each bullet point must:
1. Be tailored to what THIS reader cares about most
2. Include a page reference in parentheses, e.g., (p. 5)
3. Be concise (max 30 words per bullet)
4. Use the language style specified above

Also generate:
- A relevance_score (1-5 stars) indicating how relevant this paper is to the reader's role
- A one-sentence "why_this_matters" statement for this reader

Return JSON:
{
  "summary_points": ["point 1 (p. X)", "point 2 (p. Y)", "point 3 (p. Z)", "point 4 (p. W)"],
  "relevance_score": 4,
  "why_this_matters": "sentence"
}`;

    // 6. Call GPT-4o-mini
    const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.3,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("[generate-summary] AI error:", aiResponse.status, errText);
      throw new Error(`AI error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const rawContent = aiData.choices?.[0]?.message?.content || "";

    // 7. Parse response
    let content: Record<string, unknown>;
    try {
      const jsonMatch = rawContent.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, rawContent];
      content = JSON.parse(jsonMatch[1].trim());
    } catch {
      console.error("[generate-summary] Failed to parse AI response:", rawContent);
      throw new Error("Failed to parse summary from AI response");
    }

    // 8. Cache the result
    const sourceChunks = chunks.map((c: { chunk_id: string }) => c.chunk_id);

    const { error: insertError } = await supabase
      .from("generated_content_cache")
      .insert({
        paper_id: paperId,
        content_type: "summary",
        persona_id: subPersonaId,
        content: content,
        source_chunks: sourceChunks,
      });

    if (insertError) {
      console.warn("[generate-summary] Cache insert failed (non-blocking):", insertError);
    }

    console.log(`[generate-summary] Generated summary for paper ${paperId}, persona ${subPersonaId}`);

    return new Response(
      JSON.stringify({ success: true, cached: false, content }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[generate-summary] Generation failed, falling back to abstract:", err);

    // Fallback: return a generic summary from the paper's abstract
    const { data: paper } = await supabase
      .from("papers")
      .select("abstract, title")
      .eq("id", paperId)
      .single();

    const fallbackContent = {
      summary_points: [
        `This paper "${paper?.title || "Untitled"}" presents findings that may be relevant to your work.`,
        paper?.abstract
          ? `Abstract: ${paper.abstract.slice(0, 150)}...`
          : "No abstract available for this paper.",
        "Please refer to the full paper for detailed methodology and results.",
        "A personalized summary could not be generated at this time.",
      ],
      relevance_score: 3,
      why_this_matters: "This paper may contain insights relevant to your area of interest.",
    };

    return new Response(
      JSON.stringify({ success: true, cached: false, fallback: true, content: fallbackContent }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
