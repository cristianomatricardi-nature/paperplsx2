import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUB_PERSONA_REGISTRY } from "../_shared/sub-personas.ts";
import { composeSummaryPrompt } from "../_shared/prompt-composers.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/** Extract the most useful text from a module's cached JSON content */
function extractModuleContext(moduleId: string, content: Record<string, unknown>): string {
  const parts: string[] = [];

  switch (moduleId) {
    case "M1": {
      if (content.core_contribution) parts.push(`Core contribution: ${content.core_contribution}`);
      if (content.research_gap) parts.push(`Research gap: ${content.research_gap}`);
      if (content.novelty) parts.push(`Novelty: ${content.novelty}`);
      if (Array.isArray(content.metrics)) {
        const metricsSummary = content.metrics
          .slice(0, 5)
          .map((m: Record<string, unknown>) => `${m.label}: ${m.value}`)
          .join("; ");
        if (metricsSummary) parts.push(`Key metrics: ${metricsSummary}`);
      }
      break;
    }
    case "M2": {
      if (Array.isArray(content.claims)) {
        for (const claim of content.claims.slice(0, 4)) {
          const c = claim as Record<string, unknown>;
          parts.push(`Claim (${c.strength || "unknown"} strength): ${c.statement || c.claim_text || ""}`);
        }
      }
      break;
    }
    case "M3": {
      if (Array.isArray(content.steps)) {
        const stepSummary = content.steps
          .slice(0, 5)
          .map((s: Record<string, unknown>) => s.title || s.description || "")
          .filter(Boolean)
          .join(" → ");
        if (stepSummary) parts.push(`Methodology: ${stepSummary}`);
      }
      break;
    }
    case "M4": {
      if (Array.isArray(content.negative_results)) {
        for (const nr of content.negative_results.slice(0, 3)) {
          const n = nr as Record<string, unknown>;
          parts.push(`Negative result: ${n.description || n.hypothesis_tested || ""}`);
        }
      }
      break;
    }
    case "M5": {
      if (Array.isArray(content.actions)) {
        for (const a of content.actions.slice(0, 3)) {
          const act = a as Record<string, unknown>;
          parts.push(`Next step: ${act.action || act.description || ""}`);
        }
      }
      if (Array.isArray(content.call_to_actions)) {
        for (const a of content.call_to_actions.slice(0, 3)) {
          const act = a as Record<string, unknown>;
          parts.push(`Action: ${act.action || act.description || ""}`);
        }
      }
      break;
    }
    case "M6": {
      if (Array.isArray(content.hooks)) {
        for (const h of content.hooks.slice(0, 3)) {
          const hook = h as Record<string, unknown>;
          parts.push(`SciComm hook: ${hook.content || ""}`);
        }
      }
      if (content.one_sentence_summary) parts.push(`Summary: ${content.one_sentence_summary}`);
      break;
    }
  }

  return parts.join("\n");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  let paperId: number;
  let subPersonaId: string;
  let userId: string | undefined;

  try {
    const body = await req.json();
    paperId = body.paper_id;
    subPersonaId = body.sub_persona_id;
    userId = body.user_id;
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

  // Build composite cache key that includes user_id for researcher-specific summaries
  const cachePersonaId = userId ? `${subPersonaId}__lib_${userId}` : subPersonaId;

  // 1. Check cache
  const { data: cached } = await supabase
    .from("generated_content_cache")
    .select("content")
    .eq("paper_id", paperId)
    .eq("content_type", "summary")
    .eq("persona_id", cachePersonaId)
    .maybeSingle();

  if (cached) {
    console.log(`[generate-summary] Cache hit for paper ${paperId}, persona ${cachePersonaId}`);
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
    // 3. Fetch cached module content for this persona's summaryModules
    const moduleIds = subPersona.summaryModules;
    console.log(`[generate-summary] Fetching modules ${moduleIds.join(",")} for paper ${paperId}, persona ${subPersonaId}`);

    const { data: moduleRows, error: moduleError } = await supabase
      .from("generated_content_cache")
      .select("module_id, content")
      .eq("paper_id", paperId)
      .eq("content_type", "module")
      .eq("persona_id", subPersonaId)
      .in("module_id", moduleIds);

    if (moduleError) {
      console.error("[generate-summary] Module fetch error:", moduleError);
    }

    let contextText: string;

    if (moduleRows && moduleRows.length > 0) {
      const contextParts: string[] = [];
      for (const row of moduleRows) {
        const moduleContent = row.content as Record<string, unknown>;
        const extracted = extractModuleContext(row.module_id!, moduleContent);
        if (extracted) {
          contextParts.push(`--- Module ${row.module_id} ---\n${extracted}`);
        }
      }
      contextText = contextParts.join("\n\n");
      console.log(`[generate-summary] Built context from ${moduleRows.length} cached modules`);
    } else {
      console.warn("[generate-summary] No cached modules found, falling back to abstract");
      const { data: paper } = await supabase
        .from("papers")
        .select("abstract, title")
        .eq("id", paperId)
        .single();

      contextText = paper?.abstract
        ? `Title: ${paper.title || "Untitled"}\n\nAbstract: ${paper.abstract}`
        : "No content available for this paper.";
    }

    // Fetch figure context — find contextualization figure for "What" card
    let contextFigure: { id: string; caption: string; visual_description?: string } | undefined;
    let figureContext = "";

    const { data: spData } = await supabase
      .from("structured_papers")
      .select("figures")
      .eq("paper_id", paperId)
      .single();

    if (spData?.figures && Array.isArray(spData.figures)) {
      const figs = spData.figures as any[];

      // Find the contextualization figure, or fall back to first figure
      const ctxFig = figs.find((f: any) => f.figure_role === "contextualization") || figs[0];
      if (ctxFig) {
        contextFigure = {
          id: ctxFig.id,
          caption: ctxFig.caption || "",
          visual_description: ctxFig.visual_description || ctxFig.description || undefined,
        };
      }

      // General figure context for inline refs
      const figsWithContext = figs.filter((f: any) => f.citations?.length > 0 || f.visual_description);
      if (figsWithContext.length > 0) {
        const figLines = figsWithContext.slice(0, 8).map((f: any) => {
          const desc = f.visual_description ? ` — ${f.visual_description}` : "";
          return `${f.id}: "${f.caption}"${desc}`;
        });
        figureContext = `\n\nAvailable figures (use [FIGURE: fig_X] tokens to reference inline):\n${figLines.join("\n")}`;
      }
    }

    // Fetch researcher's other papers for personalized "What To Do Now" card
    let researcherContext: string | undefined;
    if (userId) {
      const { data: userPapers } = await supabase
        .from("papers")
        .select("id, title, abstract, source_type")
        .eq("user_id", userId)
        .eq("source_type", "library")
        .neq("id", paperId)
        .in("status", ["completed"])
        .order("created_at", { ascending: false })
        .limit(10);

      if (userPapers && userPapers.length > 0) {
        const paperSummaries = userPapers.map((p: any) => {
          const type = p.source_type === "library" ? "[Library Paper]" : "[Paper++]";
          const abstract = p.abstract ? p.abstract.slice(0, 300) : "No abstract";
          return `${type} "${p.title || "Untitled"}": ${abstract}`;
        });
        researcherContext = paperSummaries.join("\n\n");
        console.log(`[generate-summary] Including ${userPapers.length} researcher papers as context`);
      }
    }

    // 4. Build prompt
    const prompt = composeSummaryPrompt(subPersona, contextText + figureContext, {
      researcherContext,
      contextFigure,
    });

    // 5. Call Lovable AI Gateway
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
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

    // 6. Parse response
    let content: Record<string, unknown>;
    try {
      const jsonMatch = rawContent.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, rawContent];
      content = JSON.parse(jsonMatch[1].trim());
    } catch {
      console.error("[generate-summary] Failed to parse AI response:", rawContent);
      throw new Error("Failed to parse summary from AI response");
    }

    // Ensure disclaimer is present
    if (!content.disclaimer) {
      content.disclaimer = "This summary was generated by AI and may contain inaccuracies. Always refer to the original paper for definitive information.";
    }

    // Flag whether "What To Do Now" card is personalized based on researcher's library
    const personalized = !!researcherContext;

    // 7. Cache the result
    const { error: insertError } = await supabase
      .from("generated_content_cache")
      .insert({
        paper_id: paperId,
        content_type: "summary",
        persona_id: cachePersonaId,
        content: content,
        source_chunks: [],
      });

    if (insertError) {
      console.warn("[generate-summary] Cache insert failed (non-blocking):", insertError);
    }

    console.log(`[generate-summary] Generated summary for paper ${paperId}, persona ${cachePersonaId}`);

    return new Response(
      JSON.stringify({ success: true, cached: false, personalized, content }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[generate-summary] Generation failed, falling back to abstract:", err);

    const { data: paper } = await supabase
      .from("papers")
      .select("abstract, title")
      .eq("id", paperId)
      .single();

    const fallbackContent = {
      cards: [
        {
          slug: "what",
          title: "The Discovery",
          body: `This paper "${paper?.title || "Untitled"}" presents findings that may be relevant to your work. ${paper?.abstract ? paper.abstract.slice(0, 300) + "..." : "No abstract is available."}`,
          linked_module: "M1",
        },
        { slug: "why", title: "Why It Matters", body: "Please refer to the full paper for significance and context.", linked_module: "M2" },
        { slug: "how", title: "The Approach", body: "Please refer to the full paper for detailed methodology.", linked_module: "M3" },
        { slug: "next", title: "What To Do Now", body: "Review the full paper and its modules for actionable next steps.", linked_module: "M5" },
      ],
      disclaimer: "This summary was generated by AI and may contain inaccuracies. Always refer to the original paper for definitive information.",
    };

    return new Response(
      JSON.stringify({ success: true, cached: false, fallback: true, content: fallbackContent }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
