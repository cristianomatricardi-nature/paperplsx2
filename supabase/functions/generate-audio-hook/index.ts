import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    ctaStyle: "Guide them to Paper++ tools: e.g. 'Try the Replication Assistant — drag the M3 protocol cards to check if your lab can reproduce this', 'Use the AI Agent to cross-reference with your own dataset', 'Share this Paper++ link with your supervisor for feedback'",
  },
  pi_tenure: {
    modules: ["M1", "M2", "M5"],
    hookFocus: "Strategic positioning, grant opportunities, collaboration potential",
    ctaStyle: "Guide them to Paper++ tools: e.g. 'Use the AI Agent to draft a collaboration proposal based on this paper', 'Explore the Analytical Pipeline to map this into your grant framework', 'Check the Author Enrichment panel to find collaboration contacts'",
  },
  think_tank: {
    modules: ["M1", "M2", "M5"],
    hookFocus: "Policy evidence quality and actionable implications",
    ctaStyle: "Guide them to Paper++ tools: e.g. 'Download the policy infographic for your next brief', 'Use the Policy Content Matcher to align this evidence with your draft', 'Ask the AI Agent to summarize implications for your policy area'",
  },
  gov_institution: {
    modules: ["M1", "M5"],
    hookFocus: "Decision-ready bottom line and scale of impact",
    ctaStyle: "Guide them to Paper++ tools: e.g. 'Use the Confidence Scorecard to assess evidence strength', 'Export the executive summary for your briefing', 'Ask the AI Agent to contextualize this for your department'",
  },
  funder_governmental: {
    modules: ["M1", "M2", "M5"],
    hookFocus: "ROI, portfolio fit, and accountability metrics",
    ctaStyle: "Guide them to Paper++ tools: e.g. 'Open the Funder Dashboard to compare against your portfolio', 'Use the AI Agent to run an impact assessment', 'Flag this paper for your next funding round review'",
  },
  funder_private: {
    modules: ["M1", "M2", "M5"],
    hookFocus: "Mission alignment, scalability potential, and impact-per-dollar",
    ctaStyle: "Guide them to Paper++ tools: e.g. 'Add this to your pipeline review via the Funder Dashboard', 'Use the AI Agent for a due diligence check', 'Explore the Analytical Pipeline for scalability indicators'",
  },
  industry_rd: {
    modules: ["M1", "M2", "M3"],
    hookFocus: "Commercial potential, technology readiness, and IP landscape",
    ctaStyle: "Guide them to Paper++ tools: e.g. 'Open the Analytical Pipeline to assess technology readiness', 'Use the Replication Assistant to estimate scale-up requirements', 'Ask the AI Agent about IP and licensing considerations'",
  },
  science_educator: {
    modules: ["M2", "M3", "M6"],
    hookFocus: "Teaching hooks, student engagement, and classroom applicability",
    ctaStyle: "Guide them to Paper++ tools: e.g. 'Generate a lesson plan from the Educator View', 'Create a classroom demo using the Methods module', 'Use the AI Agent to simplify key concepts for your students'",
  },
};

// ── Sub-persona variables for tone matching ──
const PERSONA_TONE: Record<string, {
  jargonLevel: string;
  languageStyle: string;
  depthPreference: string;
}> = {
  phd_postdoc: { jargonLevel: "define_all", languageStyle: "Clear, encouraging, like a knowledgeable colleague", depthPreference: "exhaustive" },
  pi_tenure: { jargonLevel: "assume_domain", languageStyle: "Expert-level, strategic, concise", depthPreference: "exhaustive" },
  think_tank: { jargonLevel: "no_jargon", languageStyle: "Analytical but conversational, policy-oriented", depthPreference: "balanced" },
  gov_institution: { jargonLevel: "no_jargon", languageStyle: "Jargon-free, direct, executive tone", depthPreference: "executive" },
  funder_governmental: { jargonLevel: "no_jargon", languageStyle: "Formal but warm, accountability-oriented", depthPreference: "balanced" },
  funder_private: { jargonLevel: "no_jargon", languageStyle: "Strategic, mission-driven, persuasive", depthPreference: "balanced" },
  industry_rd: { jargonLevel: "business_terms", languageStyle: "Business-oriented, pragmatic", depthPreference: "balanced" },
  science_educator: { jargonLevel: "define_all", languageStyle: "Engaging, pedagogical, enthusiastic", depthPreference: "balanced" },
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
  const scriptPrompt = `You are creating a spoken audio hook for a scientific paper. This will be read aloud as a ~30-second audio clip.

PAPER TITLE: ${paperTitle}

PERSONA: ${subPersonaId}
- Jargon level: ${tone.jargonLevel}
- Language style: ${tone.languageStyle}
- Depth: ${tone.depthPreference}

HOOK FOCUS: ${config.hookFocus}
CTA STYLE: ${config.ctaStyle}

MODULE DATA:
${moduleContext}

PURPOSE: Generate a concise audio brief structured in 4 sections. You're a knowledgeable assistant — sound like a colleague giving advice, not reading a report.

STRUCTURE — Generate exactly 4 sections:
1. "what" — What did this paper find? (1-2 sentences, lead with the claim, mention at most 1 key number only if it strengthens the point)
2. "why" — Why does it matter for YOU specifically? (1-2 sentences, connect to the persona's work/goals)
3. "how" — How did they do it? (1 sentence, method in plain language)
4. "what_can_i_do" — What can you do next? (1-2 sentences, guide to specific Paper++ tools)

TONE RULES:
- Be conversational and persuasive, like a smart colleague
- Minimal numbers — at most 1-2 across the whole script, only when they make the claim more convincing
- Focus on the significance and what it means for the listener
- No bullet points or formatting — pure spoken prose
- Each section flows naturally into the next
- Total across all 4 sections: 60-75 words maximum`;

  console.log("[generate-audio-hook] Step 1 — generating structured script for", subPersonaId);

  const scriptData = await callAI(lovableApiKey, "openai/gpt-5", [
    {
      role: "system",
      content: `You write compelling, persona-specific spoken audio hooks for scientific papers. Your output will be converted to speech. Write naturally — no bullets, no special characters. Sound like a knowledgeable colleague giving practical advice.`,
    },
    { role: "user", content: scriptPrompt },
  ], {
    tools: [{
      type: "function",
      function: {
        name: "create_audio_hook",
        description: "Return the structured spoken hook sections and call-to-action bullets",
        parameters: {
          type: "object",
          properties: {
            sections: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string", enum: ["what", "why", "how", "what_can_i_do"] },
                  text: { type: "string", description: "The spoken text for this section" },
                },
                required: ["id", "text"],
              },
              minItems: 4,
              maxItems: 4,
              description: "Exactly 4 sections in order: what, why, how, what_can_i_do",
            },
            call_to_actions: {
              type: "array",
              items: { type: "string" },
              description: "2-3 specific, actionable next steps guiding to Paper++ tools",
              minItems: 2,
              maxItems: 3,
            },
          },
          required: ["sections", "call_to_actions"],
          additionalProperties: false,
        },
      },
    }],
    tool_choice: { type: "function", function: { name: "create_audio_hook" } },
  });

  const scriptResult = extractToolArgs(scriptData);
  if (!scriptResult?.sections?.length) throw new Error("Step 1 failed: no structured script output");

  // Concatenate sections into full spoken text
  const spokenText = scriptResult.sections.map((s: any) => s.text).join(" ");
  console.log("[generate-audio-hook] Step 1 complete — spoken_text length:", spokenText.length, "words:", spokenText.split(/\s+/).length);

  // Update job with script (intermediate state)
  await supabase.from("audio_hook_jobs").update({
    script: spokenText,
    call_to_actions: scriptResult.call_to_actions,
  }).eq("id", jobId);

  // ═══ STEP 2 — TTS via ElevenLabs with-timestamps endpoint ═══
  console.log("[generate-audio-hook] Step 2 — calling ElevenLabs TTS with timestamps...");

  const voiceId = "JBFqnCBsd6RMkjVDRZzb"; // George
  const ttsResponse = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/with-timestamps?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: {
        "xi-api-key": elevenlabsApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: spokenText,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.4,
          similarity_boost: 0.75,
          style: 0.35,
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

  const ttsResult = await ttsResponse.json();
  // with-timestamps returns: { audio_base64, alignment: { characters, character_start_times_seconds, character_end_times_seconds } }
  const audioBase64 = ttsResult.audio_base64;
  const alignment = ttsResult.alignment;

  if (!audioBase64) throw new Error("No audio_base64 in ElevenLabs response");

  console.log("[generate-audio-hook] Step 2 — got audio + alignment data");

  // ── Compute section boundaries from alignment ──
  const sectionLabels: Record<string, string> = {
    what: "What",
    why: "Why",
    how: "How",
    what_can_i_do: "What can I do",
  };

  let charOffset = 0;
  const sectionTimings: any[] = [];

  for (const section of scriptResult.sections) {
    const sectionText = section.text;
    // Find the start position in the full spoken text
    const startIdx = spokenText.indexOf(sectionText, charOffset);
    const endIdx = startIdx + sectionText.length - 1;

    let startMs = 0;
    let endMs = 0;

    if (alignment?.character_start_times_seconds && startIdx >= 0) {
      // Find start time: first non-space char in range
      for (let i = startIdx; i <= endIdx && i < alignment.character_start_times_seconds.length; i++) {
        if (alignment.character_start_times_seconds[i] !== undefined) {
          startMs = Math.round(alignment.character_start_times_seconds[i] * 1000);
          break;
        }
      }
      // Find end time: last char in range
      for (let i = endIdx; i >= startIdx; i--) {
        if (i < alignment.character_end_times_seconds.length && alignment.character_end_times_seconds[i] !== undefined) {
          endMs = Math.round(alignment.character_end_times_seconds[i] * 1000);
          break;
        }
      }
    }

    sectionTimings.push({
      id: section.id,
      label: sectionLabels[section.id] || section.id,
      start_ms: startMs,
      end_ms: endMs,
    });

    charOffset = startIdx >= 0 ? startIdx + sectionText.length : charOffset;
  }

  console.log("[generate-audio-hook] Section timings:", JSON.stringify(sectionTimings));

  // ── Decode base64 and upload MP3 ──
  // Decode base64 to Uint8Array
  const binaryStr = atob(audioBase64);
  const audioBytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    audioBytes[i] = binaryStr.charCodeAt(i);
  }

  const fileName = `audio-hooks/${paperId}_${subPersonaId}.mp3`;
  const { error: uploadError } = await supabase.storage
    .from("paper-figures")
    .upload(fileName, audioBytes.buffer, {
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

  // ── Mark job complete with timestamps + sections ──
  const { error: updateError } = await supabase.from("audio_hook_jobs").update({
    status: "complete",
    audio_url: audioUrl,
    timestamps: alignment,
    sections: sectionTimings,
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
      .select("id, status, audio_url, sections")
      .eq("paper_id", paper_id)
      .eq("sub_persona_id", sub_persona_id)
      .maybeSingle();

    if (existing) {
      if (existing.status === "complete" || existing.status === "processing") {
        return new Response(JSON.stringify({
          job_id: existing.id,
          status: existing.status,
          audio_url: existing.audio_url,
          sections: existing.sections,
        }), {
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

    // @ts-ignore - EdgeRuntime.waitUntil is available in Supabase Edge Functions
    if (typeof EdgeRuntime !== "undefined" && EdgeRuntime.waitUntil) {
      EdgeRuntime.waitUntil(pipelinePromise);
    } else {
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
