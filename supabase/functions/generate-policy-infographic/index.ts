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

  const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  let infographicSpec: { title: string; sections: string[]; key_visual_description: string };
  let paperTitle: string;
  let paperId: number;
  let subPersonaId: string;

  try {
    const body = await req.json();
    infographicSpec = body.infographic_spec;
    paperTitle = body.paper_title ?? "Scientific Research";
    paperId = body.paper_id;
    subPersonaId = body.sub_persona_id ?? "policy_advisor";
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  if (!infographicSpec) {
    return new Response(
      JSON.stringify({ error: "infographic_spec is required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // ── Fetch cached module data (M1, M2, M5) ──
  const { data: cachedModules } = await supabase
    .from("generated_content_cache")
    .select("module_id, content")
    .eq("paper_id", paperId)
    .eq("persona_id", subPersonaId)
    .in("module_id", ["M1", "M2", "M5"]);

  const moduleMap: Record<string, any> = {};
  if (cachedModules) {
    for (const row of cachedModules) {
      if (row.module_id) moduleMap[row.module_id] = row.content;
    }
  }

  const m1 = moduleMap["M1"];
  const m2 = moduleMap["M2"];
  const m5 = moduleMap["M5"];

  // ── Extract fields from modules ──
  const coreContribution = m1?.core_contribution ?? m1?.overview?.core_contribution ?? paperTitle;
  
  // M1 metrics
  const metrics: { label: string; value: string }[] = [];
  const rawMetrics = m1?.impact_analysis?.metrics ?? m1?.metrics ?? [];
  for (const m of rawMetrics.slice(0, 5)) {
    if (m?.label && m?.value) metrics.push({ label: m.label, value: String(m.value) });
  }

  // M2 claims
  const claims: { statement: string; strength: string }[] = [];
  const rawClaims = m2?.claims ?? m2 ?? [];
  const claimArr = Array.isArray(rawClaims) ? rawClaims : [];
  for (const c of claimArr.slice(0, 4)) {
    if (c?.statement || c?.claim) {
      claims.push({
        statement: c.statement ?? c.claim ?? "",
        strength: c.strength ?? c.evidence_strength ?? "moderate",
      });
    }
  }

  // M5 actions
  const policyActions: string[] = [];
  const researchActions: string[] = [];
  if (m5) {
    const pa = m5.policy_actions ?? m5.recommended_actions ?? [];
    for (const a of (Array.isArray(pa) ? pa : []).slice(0, 2)) {
      policyActions.push(typeof a === "string" ? a : a?.action ?? a?.title ?? String(a));
    }
    const ra = m5.research_actions ?? m5.next_steps ?? [];
    for (const a of (Array.isArray(ra) ? ra : []).slice(0, 2)) {
      researchActions.push(typeof a === "string" ? a : a?.action ?? a?.title ?? String(a));
    }
  }

  // ── Compose prompt ──
  let promptText = `Create a professional policy infographic for scientific research communication.

TITLE: ${coreContribution}
PAPER: ${paperTitle}
`;

  if (claims.length > 0) {
    promptText += `\nKEY RESULTS (from peer-reviewed evidence):\n`;
    claims.forEach((c, i) => {
      promptText += `${i + 1}. ${c.statement} [${c.strength}]\n`;
    });
  }

  if (metrics.length > 0) {
    promptText += `\nKEY METRICS:\n`;
    metrics.forEach((m) => {
      promptText += `- ${m.label}: ${m.value}\n`;
    });
  }

  const allActions = [...policyActions, ...researchActions];
  if (allActions.length > 0) {
    promptText += `\nRECOMMENDED ACTIONS:\n`;
    allActions.forEach((a, i) => {
      promptText += `${i + 1}. ${a}\n`;
    });
  }

  promptText += `
VISUAL GUIDANCE: ${infographicSpec.key_visual_description}

Style: Clean government/policy report, dark teal (#006B7D) and white,
sans-serif typography, landscape format (wide), include data charts or icons where appropriate.
No photographs, pure infographic. Include a title at the top and source attribution at the bottom.`;

  // ── Optional: fetch PDF page 1 as visual context ──
  let pdfBase64: string | null = null;
  try {
    const { data: paper } = await supabase
      .from("papers")
      .select("storage_path")
      .eq("id", paperId)
      .single();

    if (paper?.storage_path) {
      const { data: fileData } = await supabase.storage
        .from("research-papers")
        .download(paper.storage_path);

      if (fileData) {
        const arrayBuf = await fileData.arrayBuffer();
        const { getDocument } = await import("npm:pdfjs-serverless@0.5.1");
        const pdf = await getDocument(new Uint8Array(arrayBuf));
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 1.5 });

        // Use OffscreenCanvas for rendering in Deno
        const canvas = new OffscreenCanvas(viewport.width, viewport.height);
        const ctx = canvas.getContext("2d")!;
        await page.render({ canvasContext: ctx, viewport }).promise;

        const blob = await canvas.convertToBlob({ type: "image/png" });
        const buf = await blob.arrayBuffer();
        pdfBase64 = `data:image/png;base64,${btoa(String.fromCharCode(...new Uint8Array(buf)))}`;
      }
    }
  } catch (pdfErr) {
    console.warn("[generate-policy-infographic] PDF rendering skipped:", pdfErr);
  }

  // ── Build message content ──
  const contentParts: any[] = [{ type: "text", text: promptText }];
  if (pdfBase64) {
    contentParts.push({
      type: "image_url",
      image_url: { url: pdfBase64 },
    });
  }

  try {
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-pro-image-preview",
        messages: [
          {
            role: "user",
            content: contentParts,
          },
        ],
        modalities: ["image", "text"],
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      const errText = await aiResponse.text();
      console.error("[generate-policy-infographic] AI gateway error:", status, errText);

      if (status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      throw new Error(`AI gateway error: ${status}`);
    }

    const aiData = await aiResponse.json();
    const imageData = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageData) {
      console.error("[generate-policy-infographic] No image in response:", JSON.stringify(aiData).slice(0, 500));
      throw new Error("No image returned from AI model");
    }

    // ── Upload base64 image to storage ──
    const base64Content = imageData.replace(/^data:image\/\w+;base64,/, "");
    const binaryStr = atob(base64Content);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }

    const fileName = `policy-infographic-${paperId}-${Date.now()}.png`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("paper-figures")
      .upload(fileName, bytes.buffer, { contentType: "image/png", upsert: false });

    let storedUrl: string;
    if (!uploadError && uploadData) {
      const { data: publicData } = supabase.storage.from("paper-figures").getPublicUrl(fileName);
      storedUrl = publicData.publicUrl;
    } else {
      console.warn("[generate-policy-infographic] Upload failed, returning inline:", uploadError);
      storedUrl = imageData; // fallback to base64 data URL
    }

    return new Response(
      JSON.stringify({
        success: true,
        image_url: storedUrl,
        debug: {
          prompt_text: promptText,
          model: "google/gemini-3-pro-image-preview",
          modules_used: { M1: m1 ?? null, M2: m2 ?? null, M5: m5 ?? null },
          pdf_included: !!pdfBase64,
          claims_extracted: claims,
          metrics_extracted: metrics,
          actions_extracted: { policy: policyActions, research: researchActions },
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[generate-policy-infographic] Failed:", err);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Infographic generation failed",
        details: err instanceof Error ? err.message : String(err),
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
