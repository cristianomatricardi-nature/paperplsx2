import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { paper_id, steps } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const stepsText = (steps || []).map((s: any, i: number) =>
      `Step ${i + 1}: ${s.title}\n  Description: ${s.description || 'N/A'}\n  Tools: ${(s.tools || []).join(', ') || 'None'}\n  Reagents: ${(s.reagents || []).join(', ') || 'None'}\n  Duration: ${s.duration || 'N/A'}\n  Conditions: ${(s.conditions || []).join(', ') || 'N/A'}`
    ).join('\n\n');

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are a scientific protocol visualization expert. Given a list of method steps from a research paper, create a clear and concise visual text summary that could serve as an infographic. Use arrows (→), numbered steps, timing information, and key equipment callouts. Format it as a clean, readable text-based infographic with clear flow indicators. Keep it under 500 words.`
          },
          {
            role: "user",
            content: `Create a visual text infographic for this protocol (Paper ID: ${paper_id}):\n\n${stepsText}`
          }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const result = await response.json();
    const infographic = result.choices?.[0]?.message?.content ?? "";

    return new Response(JSON.stringify({ infographic }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
