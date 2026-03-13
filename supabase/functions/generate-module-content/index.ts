import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUB_PERSONA_REGISTRY } from "../_shared/sub-personas.ts";
import { composeModulePrompt } from "../_shared/prompt-composers.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Module-specific embedding queries
const MODULE_QUERIES: Record<string, string> = {
  M1: "introduction, background, motivation, contribution, novelty, significance, key results summary, discussion of implications, prior work comparison",
  M2: "results, findings, statistical analysis, evidence, claims, methodology context, discussion of limitations, research motivation",
  M3: "methods, protocols, experimental setup, research context and motivation, key results validating the approach, tools, reagents, software",
  M4: "negative results, null findings, limitations, failed approaches, context of what was expected, discussion, exploratory findings",
  M5: "future work, recommendations, conclusions, research context, key findings motivating next steps, collaboration opportunities",
  M6: "abstract, introduction, key results, real world applications, conclusions, broader impact, plain language summary, analogies",
};

// Module-specific prompt instructions
const MODULE_TITLE_INSTRUCTION = `
IMPORTANT: Include a top-level "module_title" field in your JSON response.
This should be a concise (8-15 word) title that captures the specific content of this module for THIS paper.
NOT the generic module type name — write a title like a journal article section heading that summarizes what THIS module covers for THIS specific paper.
Example: "CRISPR-Cas9 Achieves 94% Editing Efficiency in Human T-Cells" instead of "Contribution & Impact".
Place "module_title" at the same level as "tabs" in the JSON.
`;

const MODULE_PROMPTS: Record<string, string> = {
  M1: `Generate the Contribution & Impact module. This module is a SELF-CONTAINED knowledge lens: a reader should understand the entire paper's significance by reading only this module.

STRUCTURE — produce a narrative with three layers:

1. **Context Bridge** (2-3 sentences): What problem does this paper address? Why does it matter to the field? Pull heavily from the introduction and background sections.

2. **Focal Content** — the contribution and impact lens:
   - The core contribution statement (what is genuinely new)
   - Impact assessment: how this changes the field
   - Comparison with prior work (what existed before vs. what this adds)
   - ALL quantitative impact metrics — extract every number the paper reports
   - References to relevant figures: use [FIGURE: fig_X] placeholders
   - Page citations for every factual claim: (p. X)

3. **Cross-reference pointers** (1-2 sentences): Briefly note that detailed methods are in the Methods module and full claim-by-claim evidence is in the Claims module. Do NOT duplicate that detail — just acknowledge it exists.

IMPORTANT: The "metrics" array must include EVERY quantitative result reported in the paper that relates to contribution and impact. Include sample sizes, performance gains, effect magnitudes, statistical thresholds, and any numerical comparisons. Show at least as many rows as there are distinct quantitative results in the paper. Never collapse multiple numbers into a single row.

Return JSON with this structure:
{
  "tabs": {
    "introduction": {
      "context_bridge": "2-3 sentences: what problem does this paper address and why it matters to the field",
      "module_focus": "1-2 sentences: this module analyzes the paper's core contribution, quantitative impact, and comparison with prior work",
      "cross_references": "Brief pointers: for detailed evidence assessment see the Claims module; for step-by-step methods see the Methods module"
    },
    "overview": {
      "core_contribution": "the main novel contribution",
      "novelty_statement": "what makes this different from prior work"
    },
    "impact_analysis": {
      "field_impact": "how this changes the field",
      "broader_impact": "societal/practical implications",
      "metrics": [
        { "metric": "primary outcome measure", "value": "exact number/range", "comparison": "vs prior work / baseline", "page_ref": 5 },
        { "metric": "sample size", "value": "n=X", "comparison": "context", "page_ref": 3 },
        { "metric": "effect size", "value": "d=X.XX or OR=X.XX", "comparison": "vs benchmark", "page_ref": 6 },
        { "metric": "performance gain", "value": "X% improvement", "comparison": "over previous SOTA", "page_ref": 8 },
        { "metric": "statistical significance", "value": "p<X.XXX", "comparison": "threshold used", "page_ref": 5 }
      ],
      "quantitative_highlights": "Narrative paragraph summarizing ALL key numbers from the paper: sample sizes, effect sizes, performance gains, confidence intervals, and any numerical comparisons with prior work."
    },
    "prior_work_comparison": {
      "before": "what existed before this paper",
      "after": "what this paper enables",
      "key_differences": ["difference 1", "difference 2"]
    }
  }
}`,

  M2: `Generate the Claim & Evidence module. This module is a SELF-CONTAINED knowledge lens: a reader should be able to evaluate the paper's evidence quality by reading only this module.

STRUCTURE — produce a narrative with three layers:

1. **Context Bridge** (2-3 sentences): What is this research about and what question does it try to answer? Summarize the motivation so claims make sense without reading any other module.

2. **Focal Content** — the evidence lens:
   - Each claim as a separate card with:
     * The claim statement
     * Evidence strength badge (strong/moderate/preliminary/speculative)
     * Supporting statistics and data
     * Related figures: [FIGURE: fig_X]
     * Related methods: link to M3
     * Page reference: (p. X)
   - Cross-references between claims (which claims support or depend on each other)

3. **Cross-reference pointers** (included in evidence_summary.overall_assessment): Briefly note that the full methodology is detailed in the Methods module and broader impact is in the Contribution module.

CRITICAL: Extract EVERY quantitative result reported for each claim — p-values, confidence intervals, effect sizes, sample sizes, power, R-squared, AUC, accuracy, F1, fold changes, hazard ratios, odds ratios, correlation coefficients, means, standard deviations, or ANY other reported metric. Do NOT summarize numbers into text — list each one as a separate entry in the statistics array. A claim with fewer than 3 statistics entries is likely missing data — go back and extract more.

Return JSON:
{
  "tabs": {
    "introduction": {
      "context_bridge": "2-3 sentences: what is this research about and what question does it try to answer",
      "module_focus": "1-2 sentences: this module evaluates every claim in the paper and grades the strength of its supporting evidence",
      "cross_references": "Brief pointers: for the full methodology see the Methods module; for broader impact see the Contribution module"
    },
    "claims": [
      {
        "id": "claim_1",
        "statement": "the claim",
        "strength": "strong",
        "evidence": "supporting evidence with statistics",
        "statistics": [
          { "name": "p-value", "value": "<0.001" },
          { "name": "effect size (Cohen's d)", "value": "0.82" },
          { "name": "95% CI", "value": "[0.45, 1.19]" },
          { "name": "sample size", "value": "n=342" },
          { "name": "power", "value": "0.95" }
        ],
        "figure_refs": ["fig_1"],
        "method_refs": ["method_1"],
        "page_refs": [5, 6],
        "depends_on": ["claim_2"]
      }
    ],
    "evidence_summary": {
      "total_claims": 5,
      "strong": 2,
      "moderate": 2,
      "preliminary": 1,
      "overall_assessment": "narrative assessment of evidence quality, including brief note on what the Contribution and Methods modules cover in more depth"
    }
  }
}`,

  M3: `Generate the Method & Protocol module. This module is a SELF-CONTAINED knowledge lens: a researcher should be able to replicate the work by reading only this module.

STRUCTURE — produce a narrative with three layers:

1. **Context Bridge** (2-3 sentences): What problem is being solved and why? What is the research question? This ensures a lab researcher understands WHY they are following these steps before diving into HOW.

2. **Focal Content** — the methods lens:
   - Each method step as a numbered card with:
     * Step title and detailed description
     * Required tools (as badge chips)
     * Required reagents with concentrations (as badge chips)
     * Required software with versions (as badge chips)
     * Environmental conditions
     * Duration estimate
     * Quantitative parameters: ALL numerical specs (concentrations, temperatures, RPMs, voltages, flow rates, incubation times, etc.)
     * Critical notes and warnings
     * Page reference: (p. X)
   - A reproducibility assessment score (1-10)
   - A list of potential pitfalls

3. **Cross-reference pointers** (included in reproducibility section): Briefly note which key results validate these methods (from the Claims module) and how the contribution framing contextualizes the approach (from the Contribution module).

Return JSON:
{
  "tabs": {
    "introduction": {
      "context_bridge": "2-3 sentences: what problem is being solved and why, what is the research question",
      "module_focus": "1-2 sentences: this module provides step-by-step protocols and methods for replicating this work",
      "cross_references": "Brief pointers: for key results validating these methods see the Claims module; for broader context see the Contribution module"
    },
    "protocol_steps": [
      {
        "id": "method_1",
        "step_number": 1,
        "title": "step title",
        "description": "detailed description",
        "tools": ["tool 1"],
        "reagents": ["reagent 1 (concentration)"],
        "software": ["software v1.0"],
        "conditions": ["37°C", "5% CO2"],
        "duration": "2 hours",
        "quantitative_parameters": [
          { "parameter": "centrifuge speed", "value": "14,000 RPM", "page_ref": 4 },
          { "parameter": "incubation temperature", "value": "37°C ± 0.5°C", "page_ref": 4 },
          { "parameter": "concentration", "value": "10 µM", "page_ref": 3 }
        ],
        "critical_notes": ["warning 1"],
        "page_refs": [3]
      }
    ],
    "analysis_methods": [
      {
        "name": "statistical method",
        "description": "how it was applied",
        "software": "tool used",
        "parameters": { "key": "value" }
      }
    ],
    "reproducibility": {
      "score": 7,
      "strengths": ["detailed reagent list"],
      "gaps": ["missing centrifuge speed"],
      "pitfalls": ["temperature sensitivity noted on p. 4"]
    }
  }
}`,

  M4: `Generate the Exploratory & Negative Results module. This module is a SELF-CONTAINED knowledge lens: a reader should understand the full landscape of what didn't work, without reading any other module.

STRUCTURE — produce a narrative with three layers:

1. **Context Bridge** (2-3 sentences): What was the research trying to achieve? What were the expectations? This framing makes the negative results meaningful rather than abstract.

2. **Focal Content** — the negative results lens:
   - Each negative/null result as a card
   - Exploratory findings that need further investigation
   - Limitations acknowledged by the authors
   - Potential dead ends for future researchers to avoid

3. **Cross-reference pointers** (1-2 sentences at the end of limitations): Note that the full methods are in the Methods module and the positive results are in the Claims module.

Return JSON:
{
  "tabs": {
    "introduction": {
      "context_bridge": "2-3 sentences: what was the research trying to achieve and what were the expectations",
      "module_focus": "1-2 sentences: this module covers what didn't work, null findings, limitations, and dead ends to avoid",
      "cross_references": "Brief pointers: for the full methods see the Methods module; for positive results see the Claims module"
    },
    "negative_results": [
      {
        "id": "neg_1",
        "description": "what was found",
        "hypothesis_tested": "what was expected",
        "why_it_matters": "why this is informative",
        "page_refs": [7]
      }
    ],
    "limitations": ["limitation 1 (p. X)"],
    "exploratory_findings": ["finding that needs more investigation (p. X)"],
    "dead_ends_to_avoid": ["approach that did not work and why"]
  }
}`,

  M5: `Generate the Call-to-Actions module. This module is a SELF-CONTAINED knowledge lens: a reader should understand what to do next based on this paper, without reading any other module.

STRUCTURE — produce a narrative with three layers:

1. **Context Bridge** (2-3 sentences): What did this paper find and why does it matter? Summarize the key findings that motivate these recommendations.

2. **Focal Content** — the action lens:
   - Concrete next steps for researchers
   - Policy recommendations (if any)
   - Industry/commercial opportunities (if any)
   - Funding priorities suggested
   - Collaboration opportunities

3. **Cross-reference pointers** (1-2 sentences): Note that the full evidence is in the Claims module and limitations to consider are in the Negative Results module.

Return JSON:
{
  "tabs": {
    "introduction": {
      "context_bridge": "2-3 sentences: what did this paper find and why does it matter",
      "module_focus": "1-2 sentences: this module provides concrete next steps, recommendations, and opportunities arising from this research",
      "cross_references": "Brief pointers: for the full evidence see the Claims module; for limitations to consider see the Negative Results module"
    },
    "research_actions": [
      {
        "action": "specific recommended next step",
        "urgency": "high|medium|low",
        "rationale": "why this matters",
        "page_refs": [8]
      }
    ],
    "policy_actions": [],
    "industry_actions": [],
    "funding_priorities": [],
    "collaboration_opportunities": []
  }
}`,

  M6: `Generate the SciComms module. This module is a SELF-CONTAINED knowledge lens: a non-specialist reader should understand the entire paper's significance by reading only this module.

STRUCTURE — produce a narrative with three layers:

1. **Context Bridge** (2-3 sentences): What is the big-picture problem? Why should the public care? Use everyday language to frame the research question.

2. **Focal Content** — the communication lens:
   - A plain-language summary (max 150 words, no jargon)
   - 2-3 analogies that explain the core concept
   - A 'real-world impact' statement
   - A 'surprising finding' hook
   - A suggested social media post (280 chars)
   - Key talking points for presentations
   - A suggested infographic outline

3. **Cross-reference pointers** (included naturally in the summary): Mention that detailed data backs these claims (in the Claims module) and the full methodology is available (in the Methods module), but do NOT go into detail.

Return JSON:
{
  "tabs": {
    "introduction": {
      "context_bridge": "2-3 sentences: what is the big-picture problem and why should the public care",
      "module_focus": "1-2 sentences: this module translates the research into plain language, analogies, and communication tools",
      "cross_references": "Brief pointers: for detailed evidence see the Claims module; for the full methodology see the Methods module"
    },
    "plain_language_summary": "accessible summary",
    "analogies": [
      { "concept": "what it explains", "analogy": "the analogy", "audience": "target" }
    ],
    "real_world_impact": "statement about practical implications",
    "surprising_finding": "the most unexpected result",
    "social_media_post": "280-char post",
    "talking_points": ["point 1", "point 2"],
    "infographic_outline": {
      "title": "suggested title",
      "sections": ["section 1", "section 2"],
      "key_visual": "description of main visual"
    }
  }
}`,
};

// buildPersonaBlock removed — replaced by composeModulePrompt from prompt-composers.ts

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const openaiApiKey = Deno.env.get("OPENAI_API_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  let paperId: number;
  let moduleId: string;
  let subPersonaId: string;

  try {
    const body = await req.json();
    paperId = body.paper_id;
    moduleId = body.module_id;
    subPersonaId = body.sub_persona_id;
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  if (!paperId || !moduleId || !subPersonaId) {
    return new Response(
      JSON.stringify({ error: "paper_id, module_id, and sub_persona_id are required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // 1. Check cache
  const { data: cached } = await supabase
    .from("generated_content_cache")
    .select("content")
    .eq("paper_id", paperId)
    .eq("content_type", "module")
    .eq("persona_id", subPersonaId)
    .eq("module_id", moduleId)
    .maybeSingle();

  if (cached) {
    console.log(`[generate-module-content] Cache hit: paper=${paperId} module=${moduleId} persona=${subPersonaId}`);
    return new Response(
      JSON.stringify({ success: true, cached: true, content: cached.content }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // 2. Validate module and persona
  const moduleQuery = MODULE_QUERIES[moduleId];
  const modulePrompt = MODULE_PROMPTS[moduleId];
  if (!moduleQuery || !modulePrompt) {
    return new Response(
      JSON.stringify({ error: `Unknown module_id: ${moduleId}` }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const subPersona = SUB_PERSONA_REGISTRY[subPersonaId];
  if (!subPersona) {
    return new Response(
      JSON.stringify({ error: `Unknown sub_persona_id: ${subPersonaId}` }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  try {
    // 3. Embed the module-specific query
    const embeddingResponse = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: moduleQuery,
      }),
    });

    if (!embeddingResponse.ok) {
      const errText = await embeddingResponse.text();
      console.error("[generate-module-content] Embedding error:", embeddingResponse.status, errText);
      throw new Error(`Embedding API error: ${embeddingResponse.status}`);
    }

    const embeddingData = await embeddingResponse.json();
    const queryEmbedding = embeddingData.data[0].embedding;

    // 4. Match chunks with module_relevance filtering, fallback to unfiltered
    let { data: chunks, error: matchError } = await supabase.rpc("match_chunks", {
      p_paper_id: paperId,
      p_query_embedding: JSON.stringify(queryEmbedding),
      p_match_threshold: 0.5,
      p_match_count: 15,
      p_module_id: moduleId,
    });

    if (matchError) {
      console.error("[generate-module-content] match_chunks error:", matchError);
      throw new Error(`match_chunks failed: ${matchError.message}`);
    }

    // Fallback: retry without module filter if no chunks matched
    if (!chunks || chunks.length === 0) {
      console.warn(`[generate-module-content] No module-filtered chunks for ${moduleId}, retrying without filter at 0.2`);
      const fallback = await supabase.rpc("match_chunks", {
        p_paper_id: paperId,
        p_query_embedding: JSON.stringify(queryEmbedding),
        p_match_threshold: 0.2,
        p_match_count: 15,
      });
      if (fallback.error) {
        throw new Error(`match_chunks fallback failed: ${fallback.error.message}`);
      }
      chunks = fallback.data;
    }

    // Second fallback: very low threshold
    if (!chunks || chunks.length === 0) {
      console.warn(`[generate-module-content] Still no chunks at 0.2, retrying at 0.05`);
      const fallback2 = await supabase.rpc("match_chunks", {
        p_paper_id: paperId,
        p_query_embedding: JSON.stringify(queryEmbedding),
        p_match_threshold: 0.05,
        p_match_count: 15,
      });
      if (fallback2.error) {
        throw new Error(`match_chunks second fallback failed: ${fallback2.error.message}`);
      }
      chunks = fallback2.data;
    }

    if (!chunks || chunks.length === 0) {
      throw new Error("No matching chunks found for this paper and module");
    }

    // 5. Fetch figure citation context for inline placement
    const { data: spData } = await supabase
      .from("structured_papers")
      .select("figures")
      .eq("paper_id", paperId)
      .single();

    let figureContext = "";
    if (spData?.figures && Array.isArray(spData.figures)) {
      const figs = spData.figures as any[];
      const relevantFigs = figs.filter((f) =>
        f.citations?.some((c: any) => {
          // Match citations to module-relevant sections
          const chunkPages = chunks.map((ch: any) => ch.page_numbers).flat();
          return chunkPages.includes(c.page_number);
        }) || true // Include all figures but prioritize cited ones
      );

      if (relevantFigs.length > 0) {
        const figLines = relevantFigs.slice(0, 10).map((f: any) => {
          const citationInfo = (f.citations || [])
            .slice(0, 3)
            .map((c: any) => `  - Cited: "${c.text_snippet}" (p.${c.page_number})`)
            .join("\n");
          const subPanelInfo = (f.sub_panels || [])
            .map((sp: any) => `  - Sub-panel ${sp.label} (${sp.panel_id}): ${sp.description}`)
            .join("\n");
          const visualInfo = f.visual_description ? `  - Visual: ${f.visual_description}` : "";
          return `Figure ${f.id}: "${f.caption}"\n${visualInfo}\n${citationInfo}\n${subPanelInfo}`.trim();
        });

        figureContext = `\n\nFIGURE PLACEMENT INSTRUCTIONS:
The following figures are available. Place [FIGURE: fig_X] or [FIGURE: fig_Xa] tokens at the exact locations where the paper originally references them. Use the citation snippets below to determine correct placement.

${figLines.join("\n\n")}

When a figure or sub-panel is referenced in the text you're generating, insert the corresponding [FIGURE: fig_X] token immediately after the relevant sentence.`;
      }
    }

    // 6. Build prompt with persona adaptation layer + module instructions
    const contextText = chunks
      .map((c: { page_numbers: number[]; content: string }) =>
        `[Page ${c.page_numbers.join(",")}] ${c.content}`
      )
      .join("\n\n");

    const fullPrompt = composeModulePrompt(subPersona, moduleId, contextText + figureContext, MODULE_TITLE_INSTRUCTION + "\n\n" + modulePrompt);

    // 6. Call GPT-4o with temperature 0.2
    const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        temperature: 0.2,
        messages: [{ role: "user", content: fullPrompt }],
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("[generate-module-content] AI error:", aiResponse.status, errText);
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
      console.error("[generate-module-content] Failed to parse AI response:", rawContent);
      throw new Error("Failed to parse module content from AI response");
    }

    // 8. Cache the result
    const sourceChunks = chunks.map((c: { chunk_id: string }) => c.chunk_id);

    const { error: insertError } = await supabase
      .from("generated_content_cache")
      .insert({
        paper_id: paperId,
        content_type: "module",
        persona_id: subPersonaId,
        module_id: moduleId,
        content: content,
        source_chunks: sourceChunks,
      });

    if (insertError) {
      console.warn("[generate-module-content] Cache insert failed (non-blocking):", insertError);
    }

    console.log(`[generate-module-content] Generated: paper=${paperId} module=${moduleId} persona=${subPersonaId}`);

    return new Response(
      JSON.stringify({ success: true, cached: false, content }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[generate-module-content] Generation failed:", err);

    // Fallback: return an error with paper info
    const { data: paper } = await supabase
      .from("papers")
      .select("title")
      .eq("id", paperId)
      .single();

    return new Response(
      JSON.stringify({
        success: false,
        error: `Module content generation failed for "${paper?.title || "Unknown paper"}"`,
        details: err instanceof Error ? err.message : String(err),
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
