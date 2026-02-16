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

  // Fetch structured paper data
  const { data: sp, error: spError } = await supabase
    .from("structured_papers")
    .select("metadata, abstract, claims, methods, call_to_actions")
    .eq("paper_id", paperId)
    .single();

  if (spError || !sp) {
    return new Response(
      JSON.stringify({ error: `Structured paper not found for paper_id ${paperId}` }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const metadata = sp.metadata as Record<string, unknown>;
  const abstract = sp.abstract || "";
  const claims = (sp.claims || []) as Array<{ strength?: string }>;
  const methods = (sp.methods || []) as Array<unknown>;
  const callToActions = (sp.call_to_actions || []) as Array<{ action?: string }>;

  const prompt = `You are an expert research impact analyst. Based on the following paper information, generate PROJECTED impact scores on a scale of 1-10 for each dimension. Be realistic and nuanced — not every paper scores high on every dimension.

Paper Title: ${metadata.title || "Unknown"}

Abstract: ${abstract}

Number of claims: ${claims.length}

Claim strengths: ${claims.map((c) => c.strength || "unknown").join(", ")}

Number of method steps: ${methods.length}

Call-to-actions: ${callToActions.map((c) => c.action || "").join("; ")}

Return a JSON object with these exact keys:
{
  "conceptual_influence": <1-10>,
  "methodological_adoption": <1-10>,
  "policy_relevance": <1-10>,
  "industry_transfer_potential": <1-10>,
  "educational_value": <1-10>,
  "replication_readiness": <1-10>,
  "reasoning": {
    "conceptual_influence": "brief explanation",
    "methodological_adoption": "brief explanation",
    "policy_relevance": "brief explanation",
    "industry_transfer_potential": "brief explanation",
    "educational_value": "brief explanation",
    "replication_readiness": "brief explanation"
  }
}`;

  // Call OpenAI GPT-4o-mini
  const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openaiApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!aiResponse.ok) {
    const errText = await aiResponse.text();
    console.error(`[generate-simulated-impact] AI gateway error (${aiResponse.status}):`, errText);
    return new Response(
      JSON.stringify({ error: `AI gateway error: ${aiResponse.status}` }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const aiData = await aiResponse.json();
  const rawContent = aiData.choices?.[0]?.message?.content || "";

  // Extract JSON from response (may be wrapped in markdown code block)
  let scores: Record<string, unknown>;
  try {
    const jsonMatch = rawContent.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, rawContent];
    scores = JSON.parse(jsonMatch[1].trim());
  } catch (parseErr) {
    console.error("[generate-simulated-impact] Failed to parse AI response:", rawContent);
    return new Response(
      JSON.stringify({ error: "Failed to parse impact scores from AI response" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Save to papers table
  const { error: updateError } = await supabase
    .from("papers")
    .update({
      simulated_impact_scores: scores,
      updated_at: new Date().toISOString(),
    })
    .eq("id", paperId);

  if (updateError) {
    console.error("[generate-simulated-impact] DB update error:", updateError);
    return new Response(
      JSON.stringify({ error: "Failed to save impact scores" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  console.log(`[generate-simulated-impact] Paper ${paperId}: scores saved successfully`);

  return new Response(
    JSON.stringify({ success: true, scores }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
