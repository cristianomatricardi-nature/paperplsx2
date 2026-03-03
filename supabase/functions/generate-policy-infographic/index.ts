import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SN_LOGO_URL =
  "https://xgqfevxrifleenymsfhv.supabase.co/storage/v1/object/public/paper-figures//SN_logo_RGB (2).jpg";

// ── Sub-persona variable registry (policy-relevant subset) ──
const PERSONA_VARIABLES: Record<string, {
  contentGoal: string;
  statisticsDisplay: string;
  jargonLevel: string;
  languageStyle: string;
  disclaimers: string[];
  depthPreference: string;
}> = {
  think_tank: {
    contentGoal: "Synthesize research into citable, verifiable policy insights with evidence quality assessment.",
    statisticsDisplay: "Population-level impact numbers, cost-benefit ratios, scale of effect. No raw p-values — translate to practical significance.",
    jargonLevel: "no_jargon",
    languageStyle: "Analytical but accessible. Evidence-focused, policy-oriented framing.",
    disclaimers: ["AI-inferred statistics are estimates derived from paper data — not stated by the authors. Verify independently before citing in policy documents."],
    depthPreference: "balanced",
  },
  gov_institution: {
    contentGoal: "Get the bottom line for decision-making: Is action needed? What's the scale? What's the cost?",
    statisticsDisplay: "Scale, population impact, cost-effectiveness. Decision-ready numbers only.",
    jargonLevel: "no_jargon",
    languageStyle: "Jargon-free, executive-summary style. Short sentences, clear conclusions.",
    disclaimers: ["AI-inferred impact estimates are not stated in the paper. Verify with domain experts before policy action."],
    depthPreference: "executive",
  },
  policy_advisor: {
    contentGoal: "Synthesize research into citable policy insights.",
    statisticsDisplay: "Population-level impact, cost-benefit ratios. No raw p-values.",
    jargonLevel: "no_jargon",
    languageStyle: "Analytical, accessible, evidence-focused.",
    disclaimers: ["AI-inferred estimates — not stated by the authors. Verify independently."],
    depthPreference: "balanced",
  },
};

// ── Helpers ──
async function callAI(
  apiKey: string,
  model: string,
  messages: any[],
  extras: Record<string, any> = {},
): Promise<any> {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, messages, ...extras }),
  });

  if (!res.ok) {
    const status = res.status;
    const errText = await res.text();
    console.error(`[generate-policy-infographic] AI ${model} error:`, status, errText);
    if (status === 429 || status === 402) {
      throw { status, message: status === 429 ? "Rate limit exceeded. Please try again." : "AI credits exhausted." };
    }
    throw new Error(`AI gateway error: ${status}`);
  }
  return res.json();
}

function extractToolArgs(aiData: any): any | null {
  const call = aiData.choices?.[0]?.message?.tool_calls?.[0];
  if (!call?.function?.arguments) return null;
  try {
    return JSON.parse(call.function.arguments);
  } catch {
    return null;
  }
}

// ── Main handler ──
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  let infographicSpec: { title: string; sections: string[]; key_visual_description: string };
  let paperTitle: string;
  let paperId: number;
  let subPersonaId: string;

  try {
    const body = await req.json();
    infographicSpec = body.infographic_spec;
    paperTitle = body.paper_title ?? "Scientific Research";
    paperId = body.paper_id;
    subPersonaId = body.sub_persona_id ?? "policy_advisor";
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!infographicSpec) {
    return new Response(JSON.stringify({ error: "infographic_spec is required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ── Fetch cached modules M1, M2, M5 ──
  const { data: cachedModules } = await supabase
    .from("generated_content_cache")
    .select("module_id, content")
    .eq("paper_id", paperId)
    .eq("persona_id", subPersonaId)
    .in("module_id", ["M1", "M2", "M5"]);

  const moduleMap: Record<string, any> = {};
  if (cachedModules) {
    for (const row of cachedModules) {
      if (row.module_id) moduleMap[row.module_id] = row.content;
    }
  }

  const m1 = moduleMap["M1"];
  const m2 = moduleMap["M2"];
  const m5 = moduleMap["M5"];

  // Extract fields from modules
  const coreContribution = m1?.core_contribution ?? m1?.overview?.core_contribution ?? paperTitle;

  const metrics: { label: string; value: string }[] = [];
  for (const m of (m1?.impact_analysis?.metrics ?? m1?.metrics ?? []).slice(0, 5)) {
    if (m?.label && m?.value) metrics.push({ label: m.label, value: String(m.value) });
  }

  const claims: { statement: string; strength: string }[] = [];
  const rawClaims = Array.isArray(m2?.claims ?? m2) ? (m2?.claims ?? m2) : [];
  for (const c of rawClaims.slice(0, 4)) {
    if (c?.statement || c?.claim) {
      claims.push({ statement: c.statement ?? c.claim, strength: c.strength ?? c.evidence_strength ?? "moderate" });
    }
  }

  const policyActions: string[] = [];
  const researchActions: string[] = [];
  if (m5) {
    for (const a of (Array.isArray(m5.policy_actions ?? m5.recommended_actions) ? (m5.policy_actions ?? m5.recommended_actions) : []).slice(0, 2)) {
      policyActions.push(typeof a === "string" ? a : a?.action ?? a?.title ?? String(a));
    }
    for (const a of (Array.isArray(m5.research_actions ?? m5.next_steps) ? (m5.research_actions ?? m5.next_steps) : []).slice(0, 2)) {
      researchActions.push(typeof a === "string" ? a : a?.action ?? a?.title ?? String(a));
    }
  }

  const personaVars = PERSONA_VARIABLES[subPersonaId] ?? PERSONA_VARIABLES["policy_advisor"];

  try {
    // ════════════════════════════════════════════
    // STEP 0 — Policy Relevance Assessment (openai/gpt-5)
    // ════════════════════════════════════════════
    const step0Input = `
PAPER TITLE: ${paperTitle}
CORE CONTRIBUTION: ${coreContribution}

KEY CLAIMS (${claims.length}):
${claims.map((c, i) => `${i + 1}. ${c.statement} [strength: ${c.strength}]`).join("\n")}

KEY METRICS (${metrics.length}):
${metrics.map((m) => `- ${m.label}: ${m.value}`).join("\n")}

RECOMMENDED ACTIONS:
Policy: ${policyActions.join("; ") || "None identified"}
Research: ${researchActions.join("; ") || "None identified"}
`;

    const step0Data = await callAI(lovableApiKey, "openai/gpt-5", [
      {
        role: "system",
         content: `You are a critical policy analyst. Assess whether this research has genuine, meaningful policy implications. Be brutally honest — if the research is purely theoretical, methodological, or has no clear connection to public policy decisions, say so. Do not fabricate policy connections. Honesty is more valuable than generating content.

POLICY RELEVANCE SCORE CALIBRATION (1-10):
1-3: No genuine policy connection. Purely theoretical, methodological, or domain-specific with no public policy implications.
4-5: Weak or tangential policy relevance. Could be stretched to relate to policy but no direct connection.
6-7: Indirect but meaningful policy relevance. Informs policy-adjacent decisions or provides evidence for ongoing policy debates.
8-10: Directly informs specific, identifiable policy decisions, regulations, or frameworks. You can name the policy.`,
      },
      { role: "user", content: step0Input },
    ], {
      tools: [{
        type: "function",
        function: {
          name: "assess_policy_relevance",
          description: "Return structured policy relevance assessment",
          parameters: {
            type: "object",
            properties: {
              policy_relevance_score: { type: "integer", description: "1-10 score. 1-3=no genuine policy link, 4-5=weak/tangential, 6-7=indirect but meaningful, 8-10=directly informs specific policy decisions" },
              reason: { type: "string", description: "One-paragraph explanation of why this score was given" },
              evidence_landscape: { type: "string", description: "Brief summary of the broader evidence/policy context this research sits within" },
            },
            required: ["policy_relevance_score", "reason", "evidence_landscape"],
            additionalProperties: false,
          },
        },
      }],
      tool_choice: { type: "function", function: { name: "assess_policy_relevance" } },
    });

    const step0Result = extractToolArgs(step0Data);
    if (!step0Result) throw new Error("Step 0 failed to return structured output");

    const policyScore = step0Result.policy_relevance_score ?? 0;
    console.log("[generate-policy-infographic] Step 0 — policy_relevance_score:", policyScore);

    // Policy Relevance Gate: score ≤ 5 → no infographic
    if (policyScore <= 5) {
      return new Response(JSON.stringify({
        success: true,
        policy_relevant: false,
        policy_relevance_score: policyScore,
        reason: step0Result.reason,
        debug: {
          step0_input: step0Input,
          step0_result: step0Result,
          persona_variables: personaVars,
          modules_used: { M1: m1 ?? null, M2: m2 ?? null, M5: m5 ?? null },
        },
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ════════════════════════════════════════════
    // STEP 1 — Script Generation (openai/gpt-5.2)
    // ════════════════════════════════════════════
    const step1Prompt = `
You are creating a structured script for a single-page policy infographic about scientific research.

PERSONA CONTEXT:
- Content goal: ${personaVars.contentGoal}
- Statistics display: ${personaVars.statisticsDisplay}
- Jargon level: ${personaVars.jargonLevel}
- Language style: ${personaVars.languageStyle}
- Depth: ${personaVars.depthPreference}

PAPER: ${paperTitle}
CORE CONTRIBUTION: ${coreContribution}
EVIDENCE LANDSCAPE (from policy assessment): ${step0Result.evidence_landscape}

KEY CLAIMS:
${claims.map((c, i) => `${i + 1}. ${c.statement} [${c.strength}]`).join("\n")}

KEY METRICS:
${metrics.map((m) => `- ${m.label}: ${m.value}`).join("\n")}

RECOMMENDED ACTIONS:
${[...policyActions, ...researchActions].map((a, i) => `${i + 1}. ${a}`).join("\n")}

Create an infographic script with clear, concise text for each section. Adapt all language to the persona's jargon level and style. Translate statistics to the persona's preferred display format.
`;

    const step1Data = await callAI(lovableApiKey, "openai/gpt-5.2", [
      { role: "system", content: "You create structured infographic scripts for policy communication of scientific research. Be concise and precise." },
      { role: "user", content: step1Prompt },
    ], {
      tools: [{
        type: "function",
        function: {
          name: "create_infographic_script",
          description: "Return structured infographic script sections",
          parameters: {
            type: "object",
            properties: {
              header: { type: "string", description: "Main infographic title (max 15 words)" },
              evidence_landscape: { type: "string", description: "1-2 sentence context bar text about broader evidence" },
              key_findings: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    label: { type: "string" },
                    value: { type: "string" },
                    icon_hint: { type: "string", description: "Suggested flat vector icon (e.g. 'chart-bar', 'shield', 'people')" },
                  },
                  required: ["label", "value"],
                  additionalProperties: false,
                },
                description: "3-5 key findings as data viz boxes",
              },
              recommendations: {
                type: "array",
                items: { type: "string" },
                description: "2-4 actionable recommendations",
              },
              key_takeaway: { type: "string", description: "Single most important takeaway sentence" },
              source_citation: { type: "string", description: "Formatted citation for the paper" },
              disclaimer: { type: "string", description: "Brief disclaimer if applicable" },
            },
            required: ["header", "evidence_landscape", "key_findings", "recommendations", "key_takeaway", "source_citation"],
            additionalProperties: false,
          },
        },
      }],
      tool_choice: { type: "function", function: { name: "create_infographic_script" } },
    });

    const script = extractToolArgs(step1Data);
    if (!script) throw new Error("Step 1 failed to return structured script");

    console.log("[generate-policy-infographic] Step 1 — script generated, findings:", script.key_findings?.length);

    // ════════════════════════════════════════════
    // STEP 2 — Image Generation (google/gemini-3-pro-image-preview)
    // ════════════════════════════════════════════

    // Build the image prompt from script
    const findingsText = (script.key_findings ?? [])
      .map((f: any, i: number) => `  ${i + 1}. "${f.label}: ${f.value}"${f.icon_hint ? ` [icon: ${f.icon_hint}]` : ""}`)
      .join("\n");

    const recsText = (script.recommendations ?? [])
      .map((r: string, i: number) => `  ${i + 1}. "${r}"`)
      .join("\n");

    const imagePrompt = `A professional, single-page infographic-style visual explainer
with a clean, top-to-bottom schematic flow.

Layout: Distinct sections separated by clean lines.
Content to render:
- Top Header: "${script.header}"
- Context Bar: "${script.evidence_landscape}"
- Central Section: data viz boxes with key findings, flat vector icons:
${findingsText}
- Highlighted Box: "${script.key_takeaway}"
- Action Strip: recommendations:
${recsText}
- Footer: "${script.source_citation}"${script.disclaimer ? `\n  Disclaimer: "${script.disclaimer}"` : ""}

Style: Use Merriweather Sans typography for all text.
Strictly follow a five-color palette: Universal Blue, Deep Teal Blue,
Orange, Green, and Purple. Flat vector icons only;
no photographic elements.

Logo placement: In the bottom-right corner, reproduce the Springer
Nature logo exactly as shown in the attached reference image. Place
it on a light background. Do not modify, redraw, or stylize the
logo — use it as-is.

Vibe: Clean, academic, highly organized, and modern.`;

    // Build content parts
    const contentParts: any[] = [
      { type: "text", text: imagePrompt },
      { type: "image_url", image_url: { url: SN_LOGO_URL } },
    ];

    // Optional: PDF page 1 as visual context
    let pdfIncluded = false;
    try {
      const { data: paper } = await supabase
        .from("papers")
        .select("storage_path")
        .eq("id", paperId)
        .single();

      if (paper?.storage_path) {
        const { data: fileData } = await supabase.storage
          .from("research-papers")
          .download(paper.storage_path);

        if (fileData) {
          const arrayBuf = await fileData.arrayBuffer();
          const { getDocument } = await import("npm:pdfjs-serverless@0.5.1");
          const pdf = await getDocument(new Uint8Array(arrayBuf));
          const page = await pdf.getPage(1);
          const viewport = page.getViewport({ scale: 1.5 });
          const canvas = new OffscreenCanvas(viewport.width, viewport.height);
          const ctx = canvas.getContext("2d")!;
          await page.render({ canvasContext: ctx, viewport }).promise;
          const blob = await canvas.convertToBlob({ type: "image/png" });
          const buf = await blob.arrayBuffer();
          const pdfBase64 = `data:image/png;base64,${btoa(String.fromCharCode(...new Uint8Array(buf)))}`;
          contentParts.push({ type: "image_url", image_url: { url: pdfBase64 } });
          pdfIncluded = true;
        }
      }
    } catch (pdfErr) {
      console.warn("[generate-policy-infographic] PDF rendering skipped:", pdfErr);
    }

    const step2Data = await callAI(lovableApiKey, "google/gemini-3-pro-image-preview", [
      { role: "user", content: contentParts },
    ], { modalities: ["image", "text"] });

    const imageData = step2Data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!imageData) {
      console.error("[generate-policy-infographic] No image in response:", JSON.stringify(step2Data).slice(0, 500));
      throw new Error("No image returned from AI model");
    }

    // ── Upload to storage ──
    const base64Content = imageData.replace(/^data:image\/\w+;base64,/, "");
    const binaryStr = atob(base64Content);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);

    const fileName = `policy-infographic-${paperId}-${Date.now()}.png`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("paper-figures")
      .upload(fileName, bytes.buffer, { contentType: "image/png", upsert: false });

    let storedUrl: string;
    if (!uploadError && uploadData) {
      const { data: publicData } = supabase.storage.from("paper-figures").getPublicUrl(fileName);
      storedUrl = publicData.publicUrl;
    } else {
      console.warn("[generate-policy-infographic] Upload failed, returning inline:", uploadError);
      storedUrl = imageData;
    }

    return new Response(JSON.stringify({
      success: true,
      policy_relevant: true,
      policy_relevance_score: policyScore,
      image_url: storedUrl,
      debug: {
        step0_input: step0Input,
        step0_result: step0Result,
        script_prompt: step1Prompt,
        script_result: script,
        image_prompt: imagePrompt,
        persona_variables: personaVars,
        model_step0: "openai/gpt-5",
        model_step1: "openai/gpt-5.2",
        model_step2: "google/gemini-3-pro-image-preview",
        modules_used: { M1: m1 ?? null, M2: m2 ?? null, M5: m5 ?? null },
        pdf_included: pdfIncluded,
        claims_extracted: claims,
        metrics_extracted: metrics,
        actions_extracted: { policy: policyActions, research: researchActions },
      },
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err: any) {
    // Handle rate limit / credits errors
    if (err?.status === 429 || err?.status === 402) {
      return new Response(JSON.stringify({ success: false, error: err.message }), {
        status: err.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.error("[generate-policy-infographic] Failed:", err);
    return new Response(JSON.stringify({
      success: false,
      error: "Infographic generation failed",
      details: err instanceof Error ? err.message : String(err),
    }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
