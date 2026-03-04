import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Persona-specific module selection & hook config ──
const PERSONA_AUDIO_CONFIG: Record<string, {
  modules: string[];
  hookFocus: string;
  ctaStyle: string;
}> = {
  phd_postdoc: {
    modules: ["M1", "M2", "M3", "M5"],
    hookFocus: "Deep methods, reproducibility, and how to build on this work",
    ctaStyle: "Suggest: (1) reproduce a specific protocol, (2) combine with their dataset, (3) share with supervisor/PI",
  },
  pi_tenure: {
    modules: ["M1", "M2", "M5"],
    hookFocus: "Strategic positioning, grant opportunities, collaboration potential",
    ctaStyle: "Suggest: (1) write a collaboration proposal, (2) use in next grant application, (3) contact corresponding author",
  },
  think_tank: {
    modules: ["M1", "M2", "M5"],
    hookFocus: "Policy evidence quality and actionable implications",
    ctaStyle: "Suggest: (1) cite in next policy brief, (2) commission a follow-up analysis",
  },
  gov_institution: {
    modules: ["M1", "M5"],
    hookFocus: "Decision-ready bottom line and scale of impact",
    ctaStyle: "Suggest: (1) brief your minister/director, (2) request a departmental review",
  },
  funder_governmental: {
    modules: ["M1", "M2", "M5"],
    hookFocus: "ROI, portfolio fit, and accountability metrics",
    ctaStyle: "Suggest: (1) flag for next funding round, (2) compare against portfolio benchmarks",
  },
  funder_private: {
    modules: ["M1", "M2", "M5"],
    hookFocus: "Mission alignment, scalability potential, and impact-per-dollar",
    ctaStyle: "Suggest: (1) add to pipeline review, (2) commission due diligence report",
  },
  industry_rd: {
    modules: ["M1", "M2", "M3"],
    hookFocus: "Commercial potential, technology readiness, and IP landscape",
    ctaStyle: "Suggest: (1) initiate licensing discussion, (2) scout the research team for talent",
  },
  science_educator: {
    modules: ["M2", "M3", "M6"],
    hookFocus: "Teaching hooks, student engagement, and classroom applicability",
    ctaStyle: "Suggest: (1) design a lesson plan, (2) create a classroom demo, (3) share with department",
  },
};

// ── Sub-persona variables for tone matching ──
const PERSONA_TONE: Record<string, {
  jargonLevel: string;
  languageStyle: string;
  depthPreference: string;
  numberPolicy: string;
}> = {
  phd_postdoc: { jargonLevel: "define_all", languageStyle: "Clear, educational, encouraging", depthPreference: "exhaustive", numberPolicy: "explained_raw" },
  pi_tenure: { jargonLevel: "assume_domain", languageStyle: "Expert-level, concise, strategic", depthPreference: "exhaustive", numberPolicy: "all_raw" },
  think_tank: { jargonLevel: "no_jargon", languageStyle: "Analytical but accessible, policy-oriented", depthPreference: "balanced", numberPolicy: "inferred_only" },
  gov_institution: { jargonLevel: "no_jargon", languageStyle: "Jargon-free, executive-summary style", depthPreference: "executive", numberPolicy: "decision_ready" },
  funder_governmental: { jargonLevel: "no_jargon", languageStyle: "Formal, accountability-oriented", depthPreference: "balanced", numberPolicy: "decision_ready" },
  funder_private: { jargonLevel: "no_jargon", languageStyle: "Strategic, mission-driven", depthPreference: "balanced", numberPolicy: "inferred_only" },
  industry_rd: { jargonLevel: "business_terms", languageStyle: "Business-oriented, ROI-focused", depthPreference: "balanced", numberPolicy: "inferred_only" },
  science_educator: { jargonLevel: "define_all", languageStyle: "Engaging, pedagogical, enthusiastic", depthPreference: "balanced", numberPolicy: "narrative_only" },
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
    console.error(`[generate-audio-hook] AI ${model} error:`, status, errText);
    if (status === 429 || status === 402) {
      throw { status, message: status === 429 ? "Rate limit exceeded." : "AI credits exhausted." };
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
  elevenlabsApiKey: string,
  paperId: number,
  subPersonaId: string,
) {
  const config = PERSONA_AUDIO_CONFIG[subPersonaId] ?? PERSONA_AUDIO_CONFIG["phd_postdoc"];
  const tone = PERSONA_TONE[subPersonaId] ?? PERSONA_TONE["phd_postdoc"];

  // Fetch cached modules
  const { data: cachedModules } = await supabase
    .from("generated_content_cache")
    .select("module_id, content")
    .eq("paper_id", paperId)
    .eq("persona_id", subPersonaId)
    .in("module_id", config.modules);

  const moduleMap: Record<string, any> = {};
  if (cachedModules) {
    for (const row of cachedModules) {
      if (row.module_id) moduleMap[row.module_id] = row.content;
    }
  }

  // Also fetch paper title
  const { data: paper } = await supabase
    .from("papers")
    .select("title")
    .eq("id", paperId)
    .single();

  const paperTitle = paper?.title ?? "Untitled Research";

  // Build module context string
  const moduleContext = config.modules
    .map((m) => {
      const content = moduleMap[m];
      if (!content) return `${m}: [not yet generated]`;
      return `${m}: ${JSON.stringify(content).slice(0, 2000)}`;
    })
    .join("\n\n");

  // ═══ STEP 1 — Script Generation (OpenAI GPT-5) ═══
  const wordLimit = tone.depthPreference === "exhaustive" ? "80-100" :
                    tone.depthPreference === "executive" ? "40-60" : "60-80";

  const scriptPrompt = `You are creating a spoken audio hook for a scientific paper. This will be read aloud as a ~30-second audio clip.

PAPER TITLE: ${paperTitle}

PERSONA: ${subPersonaId}
- Jargon level: ${tone.jargonLevel}
- Language style: ${tone.languageStyle}
- Depth: ${tone.depthPreference}
- Number policy: ${tone.numberPolicy}

HOOK FOCUS: ${config.hookFocus}
CTA STYLE: ${config.ctaStyle}

MODULE DATA:
${moduleContext}

PURPOSE: Generate a concise, actionable brief that frames the work's importance and value for this specific reader. The hook should make them want to explore the full Paper++ analysis.

RULES:
- The hook_script must be ${wordLimit} words — this maps to ~30 seconds of speech
- Write in second person ("you") to directly address the reader
- The tone must match the persona's language style exactly
- End the hook with a natural transition to the CTAs
- CTAs must be specific and actionable (not generic)
- The spoken_text combines hook + CTAs into a natural flowing script for TTS`;

  console.log("[generate-audio-hook] Step 1 — generating script for", subPersonaId);

  const scriptData = await callAI(lovableApiKey, "openai/gpt-5", [
    {
      role: "system",
      content: `You write compelling, persona-specific spoken audio hooks for scientific papers. Your output will be converted to speech. Write naturally — avoid bullet markers, special characters, or formatting. Use conversational connectors between ideas.`,
    },
    { role: "user", content: scriptPrompt },
  ], {
    tools: [{
      type: "function",
      function: {
        name: "create_audio_hook",
        description: "Return the spoken hook script and call-to-action bullets",
        parameters: {
          type: "object",
          properties: {
            hook_script: {
              type: "string",
              description: "The main hook narrative (60-100 words). Written for spoken delivery.",
            },
            call_to_actions: {
              type: "array",
              items: { type: "string" },
              description: "2-3 specific, actionable next steps for this persona",
              minItems: 2,
              maxItems: 3,
            },
            spoken_text: {
              type: "string",
              description: "The complete text to be spoken aloud: hook + natural CTA transition. Should flow as one continuous spoken piece (~30 seconds).",
            },
          },
          required: ["hook_script", "call_to_actions", "spoken_text"],
          additionalProperties: false,
        },
      },
    }],
    tool_choice: { type: "function", function: { name: "create_audio_hook" } },
  });

  const scriptResult = extractToolArgs(scriptData);
  if (!scriptResult) throw new Error("Step 1 failed: no structured script output");

  console.log("[generate-audio-hook] Step 1 complete — spoken_text length:", scriptResult.spoken_text?.length);

  // Update job with script (intermediate state)
  await supabase.from("audio_hook_jobs").update({
    script: scriptResult.spoken_text,
    call_to_actions: scriptResult.call_to_actions,
  }).eq("id", jobId);

  // ═══ STEP 2 — TTS via ElevenLabs ═══
  console.log("[generate-audio-hook] Step 2 — calling ElevenLabs TTS...");

  const voiceId = "JBFqnCBsd6RMkjVDRZzb"; // George — authoritative, clear
  const ttsResponse = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: {
        "xi-api-key": elevenlabsApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: scriptResult.spoken_text,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.6,
          similarity_boost: 0.75,
          style: 0.3,
          use_speaker_boost: true,
          speed: 1.0,
        },
      }),
    },
  );

  if (!ttsResponse.ok) {
    const errText = await ttsResponse.text();
    console.error("[generate-audio-hook] ElevenLabs error:", ttsResponse.status, errText);
    throw new Error(`ElevenLabs TTS failed: ${ttsResponse.status}`);
  }

  const audioBuffer = await ttsResponse.arrayBuffer();
  console.log("[generate-audio-hook] Step 2 — got audio, size:", audioBuffer.byteLength);

  // ── Upload MP3 to storage ──
  const fileName = `audio-hooks/${paperId}_${subPersonaId}.mp3`;
  const { error: uploadError } = await supabase.storage
    .from("paper-figures")
    .upload(fileName, audioBuffer, {
      contentType: "audio/mpeg",
      upsert: true,
    });

  if (uploadError) {
    console.error("[generate-audio-hook] Upload failed:", uploadError);
    throw new Error(`Storage upload failed: ${uploadError.message}`);
  }

  const { data: publicData } = supabase.storage.from("paper-figures").getPublicUrl(fileName);
  const audioUrl = publicData.publicUrl;

  console.log("[generate-audio-hook] Upload complete:", audioUrl);

  // ── Mark job complete ──
  const { error: updateError } = await supabase.from("audio_hook_jobs").update({
    status: "complete",
    audio_url: audioUrl,
  }).eq("id", jobId);

  if (updateError) {
    console.error("[generate-audio-hook] Job update failed:", updateError);
    throw new Error(`Job update failed: ${updateError.message}`);
  }

  console.log("[generate-audio-hook] Job complete for", paperId, subPersonaId);
}

// ── Main handler (fire-and-poll) ──
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { paper_id, sub_persona_id } = await req.json();
    if (!paper_id || !sub_persona_id) {
      return new Response(JSON.stringify({ error: "paper_id and sub_persona_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) throw new Error("LOVABLE_API_KEY not configured");

    const elevenlabsApiKey = Deno.env.get("ELEVENLABS_API_KEY");
    if (!elevenlabsApiKey) throw new Error("ELEVENLABS_API_KEY not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Check for existing job
    const { data: existing } = await supabase
      .from("audio_hook_jobs")
      .select("id, status, audio_url")
      .eq("paper_id", paper_id)
      .eq("sub_persona_id", sub_persona_id)
      .maybeSingle();

    if (existing) {
      if (existing.status === "complete" || existing.status === "processing") {
        return new Response(JSON.stringify({ job_id: existing.id, status: existing.status, audio_url: existing.audio_url }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Failed job — retry: delete old and create new
      await supabase.from("audio_hook_jobs").delete().eq("id", existing.id);
    }

    // Create job
    const { data: job, error: jobError } = await supabase
      .from("audio_hook_jobs")
      .insert({ paper_id, sub_persona_id, status: "processing" })
      .select("id")
      .single();

    if (jobError) throw new Error(`Job creation failed: ${jobError.message}`);

    // Fire background pipeline
    const pipelinePromise = runPipeline(
      job.id,
      supabase,
      lovableApiKey,
      elevenlabsApiKey,
      paper_id,
      sub_persona_id,
    ).catch(async (err) => {
      console.error("[generate-audio-hook] Pipeline failed:", err);
      await supabase.from("audio_hook_jobs").update({
        status: "failed",
        error: err?.message ?? String(err),
      }).eq("id", job.id);
    });

    // Use waitUntil to keep the function alive
    // @ts-ignore - EdgeRuntime.waitUntil is available in Supabase Edge Functions
    if (typeof EdgeRuntime !== "undefined" && EdgeRuntime.waitUntil) {
      EdgeRuntime.waitUntil(pipelinePromise);
    } else {
      // Fallback: await directly (may timeout for very long pipelines)
      await pipelinePromise;
    }

    return new Response(JSON.stringify({ job_id: job.id, status: "processing" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[generate-audio-hook] Error:", err);
    const status = err?.status ?? 500;
    return new Response(JSON.stringify({ error: err?.message ?? "Internal error" }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
