import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SN_LOGO_URL =
  "https://xgqfevxrifleenymsfhv.supabase.co/storage/v1/object/public/paper-figures/SN_logo_RGB%20(2).jpg";

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

// ── Background pipeline ──
async function runPipeline(
  jobId: string,
  supabase: any,
  lovableApiKey: string,
  paperId: number,
  paperTitle: string,
  subPersonaId: string,
  infographicSpec: any,
) {
  // Fetch cached modules M1, M2, M5
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

  // ═══ STEP 0 — Policy Relevance Assessment ═══
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
      content: `You are a critical policy analyst. Assess whether this research has genuine, meaningful policy implications. Be brutally honest — if the research is purely theoretical, methodological, or has no clear connection to public policy decisions, say so. Do not fabricate policy connections.

POLICY RELEVANCE SCORE CALIBRATION (1-10):
1-3: No genuine policy connection.
4-5: Weak or tangential policy relevance.
6-7: Indirect but meaningful policy relevance.
8-10: Directly informs specific, identifiable policy decisions.`,
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
            policy_relevance_score: { type: "integer" },
            reason: { type: "string" },
            evidence_landscape: { type: "string" },
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
  console.log("[generate-policy-infographic] Step 0 — score:", policyScore);

  // Gate: score ≤ 5 → not relevant
  if (policyScore <= 5) {
    const { error: nrError } = await supabase.from("infographic_jobs").update({
      status: "not_relevant",
      policy_relevance_score: policyScore,
      reason: step0Result.reason,
    }).eq("id", jobId);
    if (nrError) {
      console.error("[generate-policy-infographic] not_relevant update failed:", nrError);
    }
    // Best-effort debug
    try {
      await supabase.from("infographic_jobs").update({
        debug: { step0_result: step0Result, claims_count: claims.length, metrics_count: metrics.length },
      }).eq("id", jobId);
    } catch (e) {
      console.warn("[generate-policy-infographic] not_relevant debug update failed:", e);
    }
    return;
  }

  // ═══ STEP 1 — Script Generation ═══
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
EVIDENCE LANDSCAPE: ${step0Result.evidence_landscape}

KEY CLAIMS:
${claims.map((c, i) => `${i + 1}. ${c.statement} [${c.strength}]`).join("\n")}

KEY METRICS:
${metrics.map((m) => `- ${m.label}: ${m.value}`).join("\n")}

RECOMMENDED ACTIONS:
${[...policyActions, ...researchActions].map((a, i) => `${i + 1}. ${a}`).join("\n")}

Create an infographic script with clear, concise text for each section.
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
            header: { type: "string" },
            evidence_landscape: { type: "string" },
            key_findings: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  label: { type: "string" },
                  value: { type: "string" },
                  icon_hint: { type: "string" },
                },
                required: ["label", "value"],
                additionalProperties: false,
              },
            },
            recommendations: { type: "array", items: { type: "string" } },
            key_takeaway: { type: "string" },
            source_citation: { type: "string" },
            disclaimer: { type: "string" },
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
  console.log("[generate-policy-infographic] Step 1 — script generated");

  // ═══ STEP 2 — Image Generation ═══
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
Nature logo exactly as shown in the attached reference image.

Vibe: Clean, academic, highly organized, and modern.`;

  // Fetch SN logo as base64
  let logoBase64: string | null = null;
  try {
    const logoRes = await fetch(SN_LOGO_URL);
    if (logoRes.ok) {
      const logoBuf = await logoRes.arrayBuffer();
      const logoBytes = new Uint8Array(logoBuf);
      const CHUNK_SIZE = 8192;
      let binary = "";
      for (let i = 0; i < logoBytes.length; i += CHUNK_SIZE) {
        const chunk = logoBytes.subarray(i, i + CHUNK_SIZE);
        binary += String.fromCharCode.apply(null, Array.from(chunk));
      }
      logoBase64 = `data:image/jpeg;base64,${btoa(binary)}`;
    }
  } catch (e) {
    console.warn("[generate-policy-infographic] Logo fetch failed:", e);
  }

  const contentParts: any[] = [{ type: "text", text: imagePrompt }];
  if (logoBase64) {
    contentParts.push({ type: "image_url", image_url: { url: logoBase64 } });
  }

  console.log("[generate-policy-infographic] Step 2 — calling image model...");

  const step2Data = await callAI(lovableApiKey, "google/gemini-3-pro-image-preview", [
    { role: "user", content: contentParts },
  ], {});

  // Parse image from response
  let imageData: string | null = null;
  const msg = step2Data.choices?.[0]?.message;
  imageData = msg?.images?.[0]?.image_url?.url ?? msg?.images?.[0]?.url;
  if (!imageData && Array.isArray(msg?.content)) {
    const imgPart = msg.content.find((p: any) => p.type === "image_url" || p.type === "image");
    imageData = imgPart?.image_url?.url ?? imgPart?.image?.url ?? imgPart?.url;
  }
  if (!imageData && Array.isArray(msg?.content)) {
    const inlinePart = msg.content.find((p: any) => p.inline_data);
    if (inlinePart?.inline_data) {
      imageData = `data:${inlinePart.inline_data.mime_type};base64,${inlinePart.inline_data.data}`;
    }
  }

  if (!imageData) {
    console.error("[generate-policy-infographic] No image in response:", JSON.stringify(step2Data).slice(0, 500));
    throw new Error("No image returned from AI model");
  }

  console.log("[generate-policy-infographic] Step 2 — image obtained, uploading...");

  // ── Upload to storage (efficient base64 decode) ──
  const base64Content = imageData.replace(/^data:image\/\w+;base64,/, "");
  // Use built-in Deno base64 decode for efficiency
  const rawBytes = Uint8Array.from(atob(base64Content), (c) => c.charCodeAt(0));

  const fileName = `policy-infographic-${paperId}-${Date.now()}.png`;
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from("paper-figures")
    .upload(fileName, rawBytes.buffer, { contentType: "image/png", upsert: false });

  if (uploadError) {
    console.error("[generate-policy-infographic] Upload failed:", uploadError);
    throw new Error(`Storage upload failed: ${uploadError.message}`);
  }

  const { data: publicData } = supabase.storage.from("paper-figures").getPublicUrl(fileName);
  const storedUrl = publicData.publicUrl;

  console.log("[generate-policy-infographic] Upload complete:", storedUrl);

  // Update job with results (minimal debug — no full module content)
  const { error: updateError } = await supabase.from("infographic_jobs").update({
    status: "complete",
    image_url: storedUrl,
    policy_relevance_score: policyScore,
  }).eq("id", jobId);

  if (updateError) {
    console.error("[generate-policy-infographic] CRITICAL: job update failed:", updateError);
    throw new Error(`Job update failed: ${updateError.message}`);
  }
  console.log("[generate-policy-infographic] Job marked complete");

  // Best-effort debug update (non-critical)
  try {
    const debugPayload = JSON.parse(JSON.stringify({
      step0_result: step0Result,
      script_sections: Object.keys(script || {}),
      persona: subPersonaId,
      models: ["openai/gpt-5", "openai/gpt-5.2", "google/gemini-3-pro-image-preview"],
      claims_count: claims.length,
      metrics_count: metrics.length,
    }));
    await supabase.from("infographic_jobs").update({ debug: debugPayload }).eq("id", jobId);
  } catch (debugErr) {
    console.warn("[generate-policy-infographic] Debug update failed (non-critical):", debugErr);
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

  let infographicSpec: any;
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

  // Create job record
  const { data: job, error: jobError } = await supabase
    .from("infographic_jobs")
    .insert({ paper_id: paperId, sub_persona_id: subPersonaId, status: "processing" })
    .select("id")
    .single();

  if (jobError || !job) {
    console.error("[generate-policy-infographic] Job creation failed:", jobError);
    return new Response(JSON.stringify({ error: "Failed to create job" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Fire background pipeline
  EdgeRuntime.waitUntil(
    runPipeline(job.id, supabase, lovableApiKey, paperId, paperTitle, subPersonaId, infographicSpec)
      .catch(async (err) => {
        console.error("[generate-policy-infographic] Pipeline failed:", err);
        await supabase.from("infographic_jobs").update({
          status: "failed",
          error: err instanceof Error ? err.message : String(err),
        }).eq("id", job.id);
      })
  );

  // Return immediately
  return new Response(JSON.stringify({ job_id: job.id }), {
    status: 202,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
