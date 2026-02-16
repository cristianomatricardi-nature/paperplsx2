import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { paper_id, user_id } = await req.json();
    if (!paper_id || !user_id) {
      return new Response(JSON.stringify({ error: "paper_id and user_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch structured paper data
    const { data: sp, error: spErr } = await supabase
      .from("structured_papers")
      .select("metadata, methods")
      .eq("paper_id", paper_id)
      .maybeSingle();

    if (spErr) throw spErr;
    if (!sp) {
      return new Response(JSON.stringify({ error: "Structured paper not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const metadata = sp.metadata as Record<string, unknown>;
    const methods = sp.methods as Array<Record<string, unknown>>;

    const field = (metadata?.field as string) || "General Science";
    const subfield = (metadata?.subfield as string) || "";
    const title = (metadata?.title as string) || "Untitled";

    // Collect all tools/reagents/software from methods
    const allTools: string[] = [];
    const allReagents: string[] = [];
    const allSoftware: string[] = [];
    for (const m of methods) {
      if (Array.isArray(m.tools)) allTools.push(...m.tools);
      if (Array.isArray(m.reagents)) allReagents.push(...m.reagents);
      if (Array.isArray(m.software)) allSoftware.push(...m.software);
    }

    const paperRequirements = [
      ...allTools.map((t) => `Instrument: ${t}`),
      ...allReagents.map((r) => `Reagent: ${r}`),
      ...allSoftware.map((s) => `Software: ${s}`),
    ].join("\n");

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not configured");

    const prompt = `You are a lab manager. A researcher in the field of "${field}${subfield ? ` / ${subfield}` : ""}" is working on: "${title}".

Their paper requires these items:
${paperRequirements || "No specific items listed."}

Generate a realistic lab inventory of 12-18 items for a lab in this field. IMPORTANT:
- Include about 60% of items that MATCH or are SIMILAR to the paper's requirements above
- Include about 40% of items that are TYPICAL for this field but NOT in the paper (to create interesting gaps)
- For matching items, occasionally use a slightly different model or version to test compatibility checking

Return a JSON array (no markdown, no wrapping) where each item has:
- item_name (string)
- item_type (one of: instrument, reagent, software, consumable)
- manufacturer (string, realistic brand)
- model_number (string or null)
- description (string, 1 sentence)`;

    const oaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.8,
      }),
    });

    if (!oaiRes.ok) {
      const errText = await oaiRes.text();
      console.error("OpenAI error:", errText);
      throw new Error("OpenAI API error");
    }

    const oaiData = await oaiRes.json();
    let content = oaiData.choices?.[0]?.message?.content?.trim() ?? "[]";

    // Strip markdown fences if present
    if (content.startsWith("```")) {
      content = content.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    const items = JSON.parse(content) as Array<{
      item_name: string;
      item_type: string;
      manufacturer?: string;
      model_number?: string | null;
      description?: string;
    }>;

    // Insert into digital_lab_inventory
    const rows = items.map((item) => ({
      user_id,
      item_name: item.item_name,
      item_type: item.item_type,
      manufacturer: item.manufacturer || null,
      model_number: item.model_number || null,
      description: item.description || null,
    }));

    const { error: insertErr } = await supabase
      .from("digital_lab_inventory")
      .insert(rows);

    if (insertErr) throw insertErr;

    return new Response(
      JSON.stringify({ success: true, count: rows.length, field }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("simulate-lab error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
