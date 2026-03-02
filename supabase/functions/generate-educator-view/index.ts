import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUB_PERSONA_REGISTRY } from "../_shared/sub-personas.ts";
import { PARENT_PERSONA_REGISTRY } from "../_shared/parent-personas.ts";

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

  try {
    const body = await req.json();
    paperId = body.paper_id;
    subPersonaId = body.sub_persona_id;
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  if (!paperId || !subPersonaId) {
    return new Response(
      JSON.stringify({ error: "paper_id and sub_persona_id are required" }),
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

  const parentPersonaId = subPersona.parentPersona;
  const parentConfig = PARENT_PERSONA_REGISTRY[parentPersonaId];

  if (!parentConfig || parentConfig.liquefactionInputModules.length === 0) {
    return new Response(
      JSON.stringify({ error: `No liquefaction config for parent persona: ${parentPersonaId}` }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // 1. Check cache
  const { data: cached } = await supabase
    .from("generated_content_cache")
    .select("content")
    .eq("paper_id", paperId)
    .eq("content_type", "educator_view")
    .eq("persona_id", subPersonaId)
    .is("module_id", null)
    .maybeSingle();

  if (cached) {
    console.log(`[generate-educator-view] Cache hit: paper=${paperId} persona=${subPersonaId}`);
    return new Response(
      JSON.stringify({ success: true, cached: true, content: cached.content }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // 2. Fetch paper metadata
  const { data: paper, error: paperError } = await supabase
    .from("papers")
    .select("title, abstract")
    .eq("id", paperId)
    .single();

  if (paperError || !paper) {
    return new Response(
      JSON.stringify({ error: "Paper not found" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // 3. Fetch cached module content
  const modulesContent: Record<string, unknown> = {};
  const missingModules: string[] = [];

  for (const moduleId of parentConfig.liquefactionInputModules) {
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
    } else {
      missingModules.push(moduleId);
    }
  }

  // 4. Generate missing modules inline
  if (missingModules.length > 0) {
    console.log(`[generate-educator-view] Triggering generation for missing modules: ${missingModules.join(", ")}`);
    const generationPromises = missingModules.map(async (moduleId) => {
      try {
        const res = await fetch(`${supabaseUrl}/functions/v1/generate-module-content`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${serviceRoleKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ paper_id: paperId, module_id: moduleId, sub_persona_id: subPersonaId }),
        });
        if (res.ok) {
          const data = await res.json();
          modulesContent[moduleId] = data.content;
        }
      } catch (err) {
        console.warn(`[generate-educator-view] Module ${moduleId} generation error:`, err);
      }
    });
    await Promise.all(generationPromises);
  }

  // 5. Compose liquefaction prompt
  const prompt = parentConfig.liquefactionPrompt(
    { title: paper.title ?? "Unknown", abstract: paper.abstract },
    modulesContent,
  );

  if (!prompt) {
    return new Response(
      JSON.stringify({ error: `No liquefaction prompt configured for ${parentPersonaId}` }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // 6. Call GPT-4o
  try {
    const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        temperature: 0.3,
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("[generate-educator-view] AI error:", aiResponse.status, errText);
      throw new Error(`AI error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const rawContent = aiData.choices?.[0]?.message?.content || "{}";

    let content: Record<string, unknown>;
    try {
      content = JSON.parse(rawContent);
    } catch {
      throw new Error("Failed to parse AI response as JSON");
    }

    // 7. Cache the result
    const { error: insertError } = await supabase
      .from("generated_content_cache")
      .insert({
        paper_id: paperId,
        content_type: "educator_view",
        persona_id: subPersonaId,
        module_id: null,
        content,
        source_chunks: [],
      });

    if (insertError) {
      console.warn("[generate-educator-view] Cache insert failed (non-blocking):", insertError);
    }

    return new Response(
      JSON.stringify({ success: true, cached: false, content }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[generate-educator-view] Generation failed:", err);
    return new Response(
      JSON.stringify({
        success: false,
        error: `Educator view generation failed for paper ${paperId}`,
        details: err instanceof Error ? err.message : String(err),
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
