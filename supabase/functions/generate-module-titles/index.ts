import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TITLE_PROMPT = `You are a scientific paper analysis assistant. Given structured paper data, generate a concise, specific title (8-15 words) for each of the 6 Paper++ modules (M1-M6).

Each title should read like a journal article section heading that captures what THIS specific paper's module would cover. NOT the generic module name.

Module descriptions:
- M1 (Contribution & Impact): Core contribution and significance
- M2 (Claim & Evidence): Key claims and supporting evidence
- M3 (Method & Protocol): Experimental methods and protocols
- M4 (Exploratory & Negative Results): Negative findings and limitations
- M5 (Call-to-Actions): Future directions and recommendations
- M6 (SciComms): Public-facing science communication hooks

Return ONLY a JSON object like:
{
  "M1": "Title for contribution module...",
  "M2": "Title for claims module...",
  "M3": "Title for methods module...",
  "M4": "Title for negative results module...",
  "M5": "Title for call-to-actions module...",
  "M6": "Title for scicomm module..."
}`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;
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

  try {
    // Fetch structured paper data
    const { data: sp, error: spErr } = await supabase
      .from("structured_papers")
      .select("abstract, metadata, claims, methods, sections, call_to_actions, negative_results, scicomm_hooks")
      .eq("paper_id", paperId)
      .single();

    if (spErr || !sp) {
      throw new Error(`Structured paper not found for paper ${paperId}`);
    }

    // Build a compact context for the AI
    const metadata = sp.metadata as Record<string, unknown> ?? {};
    const claimsArr = (sp.claims as unknown[]) ?? [];
    const methodsArr = (sp.methods as unknown[]) ?? [];
    const negArr = (sp.negative_results as unknown[]) ?? [];
    const ctaArr = (sp.call_to_actions as unknown[]) ?? [];
    const hooksArr = (sp.scicomm_hooks as unknown[]) ?? [];

    const context = [
      `Title: ${metadata.title ?? "Unknown"}`,
      `Abstract: ${(sp.abstract ?? "").slice(0, 500)}`,
      `Claims (${claimsArr.length}): ${claimsArr.slice(0, 3).map((c: any) => c.statement ?? "").join("; ").slice(0, 300)}`,
      `Methods (${methodsArr.length}): ${methodsArr.slice(0, 4).map((m: any) => m.title ?? "").join(", ")}`,
      `Negative results: ${negArr.length}`,
      `Call-to-actions: ${ctaArr.length}`,
      `SciComm hooks: ${hooksArr.length}`,
    ].join("\n");

    // Call AI via Lovable gateway
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${lovableApiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        temperature: 0.3,
        max_tokens: 1000,
        messages: [
          { role: "system", content: TITLE_PROMPT },
          { role: "user", content: context },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      throw new Error(`AI API error (${aiResponse.status}): ${errText}`);
    }

    const aiResult = await aiResponse.json();
    let content = aiResult.choices?.[0]?.message?.content ?? "";

    // Strip markdown code fences if present
    content = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();

    let titles: Record<string, string>;
    try {
      titles = JSON.parse(content);
    } catch {
      console.error(`[generate-module-titles] Failed to parse AI response: ${content}`);
      // Deterministic fallback
      const paperTitle = (metadata.title as string ?? "Research Paper").slice(0, 40);
      titles = {
        M1: `Core Contributions and Impact of ${paperTitle}`,
        M2: `Claims and Evidence Analysis for ${paperTitle}`,
        M3: `Methods and Protocols Used in ${paperTitle}`,
        M4: `Limitations and Negative Findings in ${paperTitle}`,
        M5: `Future Directions and Recommendations from ${paperTitle}`,
        M6: `Public Science Communication for ${paperTitle}`,
      };
    }

    // Store in structured_papers.module_titles
    const { error: updateErr } = await supabase
      .from("structured_papers")
      .update({ module_titles: titles })
      .eq("paper_id", paperId);

    if (updateErr) {
      throw new Error(`Failed to update module_titles: ${updateErr.message}`);
    }

    console.log(`[generate-module-titles] Paper ${paperId}: Generated titles for ${Object.keys(titles).length} modules`);

    return new Response(
      JSON.stringify({ success: true, titles }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error(`[generate-module-titles] Paper ${paperId}: Failed:`, err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
