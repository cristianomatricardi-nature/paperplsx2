import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { paperId, items } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const itemDescriptions = (items || [])
      .map((item: any, i: number) => `${i + 1}. [${item.sourceModule}/${item.type}] ${item.title}: ${JSON.stringify(item.data ?? {})}`)
      .join("\n");

    const systemPrompt = `You are an expert research methods analyst. Given components from a scientific paper (claims, methods, figures), decompose the underlying analytical pipeline into ordered steps. For each step, identify the author's specific choice and 2-3 plausible alternatives. Extract all variables with their roles. Provide sensitivity notes for each decision point.

For each pipeline step, also provide a mock_effect_size (number 0-1 representing the author's result magnitude) and mock_alt_effect_sizes (array of numbers 0-1, one per alternative, representing plausible shifted effect sizes if that alternative were chosen).

Also provide mock_scatter_data: an array of 15-25 {x, y} data points that simulate a plausible correlation between the primary independent and dependent variables extracted from the paper. Use realistic ranges based on the paper's domain.

You MUST respond using the decompose_pipeline tool.`;

    const userPrompt = `Decompose the analytical pipeline for the following paper components:\n\n${itemDescriptions}\n\nExtract the full data-to-output pipeline, identify every analytical decision point, extract variables, and provide what-if sensitivity notes.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "decompose_pipeline",
              description: "Return the decomposed analytical pipeline with steps, variables, and summary.",
              parameters: {
                type: "object",
                properties: {
                  pipeline_steps: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "string" },
                        stage: { type: "string", enum: ["data", "cleaning", "transform", "model", "output"] },
                        title: { type: "string" },
                        description: { type: "string" },
                        author_choice: { type: "string" },
                        alternatives: { type: "array", items: { type: "string" } },
                        variables_involved: { type: "array", items: { type: "string" } },
                        sensitivity_note: { type: "string" },
                        mock_effect_size: { type: "number" },
                        mock_alt_effect_sizes: { type: "array", items: { type: "number" } },
                      },
                      required: ["id", "stage", "title", "description", "author_choice", "alternatives", "variables_involved", "sensitivity_note", "mock_effect_size", "mock_alt_effect_sizes"],
                      additionalProperties: false,
                    },
                  },
                  variables: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        role: { type: "string" },
                        description: { type: "string" },
                        paper_definition: { type: "string" },
                      },
                      required: ["name", "role", "description", "paper_definition"],
                      additionalProperties: false,
                    },
                  },
                  overall_summary: { type: "string" },
                  mock_scatter_data: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        x: { type: "number" },
                        y: { type: "number" },
                      },
                      required: ["x", "y"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["pipeline_steps", "variables", "overall_summary", "mock_scatter_data"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "decompose_pipeline" } },
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Usage limit reached. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResult = await response.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in response");

    const parsed = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("decompose-pipeline error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
