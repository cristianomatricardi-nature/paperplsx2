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

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const openaiApiKey = Deno.env.get("OPENAI_API_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  let paperId: number;
  let subPersonaId: string;
  let policyDraftText: string;

  try {
    const body = await req.json();
    paperId = body.paper_id;
    subPersonaId = body.sub_persona_id;
    policyDraftText = body.policy_draft_text;
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  if (!paperId || !subPersonaId || !policyDraftText) {
    return new Response(
      JSON.stringify({ error: "paper_id, sub_persona_id, and policy_draft_text are required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Fetch cached M1, M2, M5 content to provide paper context
  const modulesContent: Record<string, unknown> = {};
  for (const moduleId of ["M1", "M2", "M5"]) {
    const { data: moduleCache } = await supabase
      .from("generated_content_cache")
      .select("content")
      .eq("paper_id", paperId)
      .eq("content_type", "module")
      .eq("persona_id", subPersonaId)
      .eq("module_id", moduleId)
      .maybeSingle();

    if (moduleCache) {
      modulesContent[moduleId] = moduleCache.content;
    }
  }

  // Fetch paper metadata
  const { data: paper } = await supabase
    .from("papers")
    .select("title, abstract")
    .eq("id", paperId)
    .single();

  const m1 = modulesContent["M1"] as any;
  const m2 = modulesContent["M2"] as any;
  const m5 = modulesContent["M5"] as any;

  const coreContribution = m1?.tabs?.overview?.core_contribution ?? "Not available";
  const claims = (m2?.tabs?.claims ?? [])
    .slice(0, 5)
    .map((c: any) => `- ${c.statement} [${c.strength}]`)
    .join("\n");
  const policyActions = [...(m5?.tabs?.policy_actions ?? []), ...(m5?.tabs?.research_actions ?? [])]
    .slice(0, 4)
    .map((a: any) => `- ${a.action}`)
    .join("\n");

  const prompt = `You are a policy alignment analyst. Compare a scientific research paper against a policy document/draft and assess how well they align.

SCIENTIFIC PAPER:
Title: ${paper?.title ?? "Unknown"}
Abstract: ${paper?.abstract ?? "Not available"}
Core Contribution: ${coreContribution}
Key Claims:
${claims || "Not available"}
Policy Recommendations from paper:
${policyActions || "Not available"}

POLICY DOCUMENT (provided by user):
"""
${policyDraftText.slice(0, 4000)}
"""

Task: Analyze the alignment between this research and the policy document.

Return ONLY valid JSON:
{
  "fit_score": <integer 1-10>,
  "fit_reasoning": "<2-3 sentences explaining the fit score>",
  "alignment_areas": [
    { "area": "<topic or section>", "paper_evidence": "<what the paper says>", "policy_connection": "<how it connects to the policy document>" }
  ],
  "relevant_sections": [
    "<Key quote or finding from the paper that is directly relevant to the policy document>"
  ],
  "suggested_citation": "<How to properly reference/cite this paper's contribution in the policy context>",
  "gaps": ["<What the paper doesn't address that the policy document needs>"],
  "recommendation": "<Overall recommendation: should this paper be cited/referenced in this policy context? Why?>"
}`;

  try {
    const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        temperature: 0.2,
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      throw new Error(`AI error: ${aiResponse.status} - ${errText}`);
    }

    const aiData = await aiResponse.json();
    const content = JSON.parse(aiData.choices?.[0]?.message?.content || "{}");

    return new Response(
      JSON.stringify({ success: true, content }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[match-policy-content] Failed:", err);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Policy matching failed",
        details: err instanceof Error ? err.message : String(err),
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
