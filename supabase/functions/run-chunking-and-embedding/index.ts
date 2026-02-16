import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface Chunk {
  chunk_id: string;
  chunk_type: string;
  content: string;
  source_ids: string[];
  page_numbers: number[];
  module_relevance: Record<string, number>;
  paper_id: number;
  embedding?: number[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const openaiApiKey = Deno.env.get("OPENAI_API_KEY")!;
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
    // 1. Fetch the structured_papers record
    const { data: structured, error: fetchError } = await supabase
      .from("structured_papers")
      .select("*")
      .eq("paper_id", paperId)
      .single();

    if (fetchError || !structured) {
      throw new Error(`Structured paper not found for paper_id ${paperId}: ${fetchError?.message}`);
    }

    const chunks: Chunk[] = [];
    let chunkCounter = 0;

    function nextChunkId(prefix: string): string {
      chunkCounter++;
      return `${prefix}_${chunkCounter}`;
    }

    // --- Abstract chunk ---
    if (structured.abstract) {
      chunks.push({
        chunk_id: nextChunkId("abstract"),
        chunk_type: "abstract",
        content: structured.abstract,
        source_ids: [],
        page_numbers: [],
        module_relevance: { M1: 0.9, M2: 0.5, M3: 0.3, M4: 0.3, M5: 0.5, M6: 0.8 },
        paper_id: paperId,
      });
    }

    // --- Section chunks (~500 tokens, split at paragraph boundaries) ---
    const sections = (structured.sections as any[]) || [];
    for (const section of sections) {
      const paragraphs: string[] = (section.content || "").split(/\n\n+/);
      let buffer = "";
      let tokenEstimate = 0;

      for (const para of paragraphs) {
        const paraTokens = Math.ceil(para.length / 4); // rough token estimate
        if (tokenEstimate + paraTokens > 500 && buffer.length > 0) {
          chunks.push({
            chunk_id: nextChunkId("sec"),
            chunk_type: "context",
            content: buffer.trim(),
            source_ids: [section.id],
            page_numbers: section.page_numbers || [],
            module_relevance: { M1: 0.5, M2: 0.5, M3: 0.3, M4: 0.3, M5: 0.3, M6: 0.4 },
            paper_id: paperId,
          });
          buffer = "";
          tokenEstimate = 0;
        }
        buffer += (buffer ? "\n\n" : "") + para;
        tokenEstimate += paraTokens;
      }
      if (buffer.trim().length > 0) {
        chunks.push({
          chunk_id: nextChunkId("sec"),
          chunk_type: "context",
          content: buffer.trim(),
          source_ids: [section.id],
          page_numbers: section.page_numbers || [],
          module_relevance: { M1: 0.5, M2: 0.5, M3: 0.3, M4: 0.3, M5: 0.3, M6: 0.4 },
          paper_id: paperId,
        });
      }
    }

    // --- Claim chunks ---
    const claims = (structured.claims as any[]) || [];
    for (const claim of claims) {
      chunks.push({
        chunk_id: nextChunkId("claim"),
        chunk_type: "claim",
        content: `${claim.statement}\n\nEvidence: ${claim.evidence_summary}\nStrength: ${claim.strength}\nSupporting data: ${claim.supporting_data}`,
        source_ids: [claim.id],
        page_numbers: claim.page_numbers || [],
        module_relevance: { M1: 0.7, M2: 0.95, M3: 0.1, M4: 0.3, M5: 0.4, M6: 0.5 },
        paper_id: paperId,
      });
    }

    // --- Method step chunks ---
    const methods = (structured.methods as any[]) || [];
    for (const method of methods) {
      chunks.push({
        chunk_id: nextChunkId("method"),
        chunk_type: "method_step",
        content: `${method.title}\n${method.description}\nTools: ${(method.tools || []).join(", ")}\nReagents: ${(method.reagents || []).join(", ")}\nConditions: ${(method.conditions || []).join(", ")}`,
        source_ids: [method.id],
        page_numbers: method.page_numbers || [],
        module_relevance: { M1: 0.1, M2: 0.2, M3: 0.95, M4: 0.1, M5: 0.1, M6: 0.2 },
        paper_id: paperId,
      });
    }

    // --- Figure chunks ---
    const figures = (structured.figures as any[]) || [];
    for (const figure of figures) {
      chunks.push({
        chunk_id: nextChunkId("fig"),
        chunk_type: "figure_description",
        content: `Figure: ${figure.caption}\n${figure.description}\nKey findings: ${(figure.key_findings || []).join("; ")}`,
        source_ids: [figure.id],
        page_numbers: figure.page_number ? [figure.page_number] : [],
        module_relevance: { M1: 0.5, M2: 0.7, M3: 0.3, M4: 0.3, M5: 0.2, M6: 0.6 },
        paper_id: paperId,
      });
    }

    // --- Negative result chunks ---
    const negativeResults = (structured.negative_results as any[]) || [];
    for (const neg of negativeResults) {
      chunks.push({
        chunk_id: nextChunkId("neg"),
        chunk_type: "negative_result",
        content: `${neg.description}\nHypothesis tested: ${neg.hypothesis_tested}\nWhy it matters: ${neg.why_it_matters}`,
        source_ids: [neg.id],
        page_numbers: neg.page_numbers || [],
        module_relevance: { M1: 0.2, M2: 0.4, M3: 0.1, M4: 0.95, M5: 0.3, M6: 0.3 },
        paper_id: paperId,
      });
    }

    // --- Call to action chunks ---
    const callToActions = (structured.call_to_actions as any[]) || [];
    for (const cta of callToActions) {
      chunks.push({
        chunk_id: nextChunkId("cta"),
        chunk_type: "call_to_action",
        content: `${cta.action}\nTarget audience: ${cta.target_audience}\nUrgency: ${cta.urgency}`,
        source_ids: [cta.id],
        page_numbers: cta.page_numbers || [],
        module_relevance: { M1: 0.4, M2: 0.2, M3: 0.1, M4: 0.2, M5: 0.95, M6: 0.5 },
        paper_id: paperId,
      });
    }

    // --- Scicomm hook chunks ---
    const scicommHooks = (structured.scicomm_hooks as any[]) || [];
    for (const hook of scicommHooks) {
      chunks.push({
        chunk_id: nextChunkId("hook"),
        chunk_type: "scicomm_hook",
        content: `[${hook.hook_type}] ${hook.content}\nTarget audience: ${hook.target_audience}`,
        source_ids: [hook.id],
        page_numbers: [],
        module_relevance: { M1: 0.3, M2: 0.2, M3: 0.1, M4: 0.1, M5: 0.3, M6: 0.95 },
        paper_id: paperId,
      });
    }

    // 3. Generate embeddings in batches of 20
    const BATCH_SIZE = 20;
    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE);
      const inputs = batch.map((c) => c.content);

      const embeddingRes = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openaiApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "text-embedding-3-large",
          input: inputs,
        }),
      });

      if (!embeddingRes.ok) {
        const errText = await embeddingRes.text();
        throw new Error(`OpenAI Embeddings API error (${embeddingRes.status}): ${errText}`);
      }

      const embeddingData = await embeddingRes.json();
      for (let j = 0; j < batch.length; j++) {
        batch[j].embedding = embeddingData.data[j].embedding;
      }
    }

    // 5. Delete existing chunks for idempotency
    const { error: deleteError } = await supabase
      .from("chunks")
      .delete()
      .eq("paper_id", paperId);

    if (deleteError) {
      console.warn(`Warning: Failed to delete existing chunks for paper ${paperId}: ${deleteError.message}`);
    }

    // 4. Insert all chunks with embeddings
    const insertRows = chunks.map((c) => ({
      chunk_id: c.chunk_id,
      chunk_type: c.chunk_type,
      content: c.content,
      source_ids: c.source_ids,
      page_numbers: c.page_numbers,
      module_relevance: c.module_relevance,
      paper_id: c.paper_id,
      embedding: JSON.stringify(c.embedding),
    }));

    // Insert in batches to avoid payload limits
    const INSERT_BATCH = 50;
    for (let i = 0; i < insertRows.length; i += INSERT_BATCH) {
      const batch = insertRows.slice(i, i + INSERT_BATCH);
      const { error: insertError } = await supabase.from("chunks").insert(batch);
      if (insertError) {
        throw new Error(`Failed to insert chunks batch at offset ${i}: ${insertError.message}`);
      }
    }

    console.log(`[chunking] Paper ${paperId}: Created ${chunks.length} chunks with embeddings`);

    return new Response(
      JSON.stringify({ success: true, chunk_count: chunks.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error(`[chunking] Paper ${paperId}: Error:`, err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
