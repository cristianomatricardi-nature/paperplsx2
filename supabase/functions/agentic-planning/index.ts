import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { methods, requirements, inventory, field } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const missingItems = (requirements || []).filter((r: any) => r.status === 'missing');
    const availableItems = (inventory || []).map((i: any) => `${i.item_name} (${i.item_type})`).join(', ');
    const methodsSummary = (methods || []).map((m: any, i: number) =>
      `${i + 1}. ${m.title}: Tools=[${(m.tools || []).join(', ')}], Reagents=[${(m.reagents || []).join(', ')}], Software=[${(m.software || []).join(', ')}]`
    ).join('\n');

    const prompt = `You are a scientific resource planning assistant. A researcher wants to replicate a study in the field of "${field || 'general science'}".

Their lab has: ${availableItems || 'No items listed'}

The protocol requires these steps:
${methodsSummary}

Missing items they need:
${missingItems.map((m: any) => `- ${m.name} (${m.type})`).join('\n') || 'None'}

Respond with a JSON object (no markdown) containing:
{
  "resource_groups": [{"name": "group/facility name", "type": "core_facility|collaborator|vendor", "contact_hint": "how to find them"}],
  "approximations": [{"missing": "missing item", "substitute": "available substitute from their lab", "fidelity": 0-100, "note": "explanation of tradeoffs"}],
  "step_by_step": "A detailed step-by-step replication guide using their AVAILABLE equipment where possible, noting where substitutions are made",
  "instrument_setup": ["Setup instruction 1 for available instruments", "Setup instruction 2"]
}

Be practical and specific. Only suggest approximations where scientifically reasonable. For resource_groups, suggest real types of facilities (university core facilities, national labs, commercial services) relevant to the field.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a scientific resource planning AI. Always respond with valid JSON only, no markdown fences." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Credits exhausted. Please add credits." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const aiResult = await response.json();
    const content = aiResult.choices?.[0]?.message?.content ?? "{}";

    // Parse the JSON response, stripping markdown fences if present
    let parsed;
    try {
      const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = {
        resource_groups: [],
        approximations: [],
        step_by_step: content,
        instrument_setup: [],
      };
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
