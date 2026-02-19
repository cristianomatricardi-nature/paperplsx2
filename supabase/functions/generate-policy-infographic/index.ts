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

  const openaiApiKey = Deno.env.get("OPENAI_API_KEY")!;
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  let infographicSpec: { title: string; sections: string[]; key_visual_description: string };
  let paperTitle: string;
  let paperId: number;

  try {
    const body = await req.json();
    infographicSpec = body.infographic_spec;
    paperTitle = body.paper_title ?? "Scientific Research";
    paperId = body.paper_id;
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

  // Compose DALL-E 3 prompt from the infographic spec
  const imagePrompt = `Create a clean, professional policy infographic for scientific research communication.

Title: "${infographicSpec.title}"
Paper: "${paperTitle}"

Key sections to visualize:
${infographicSpec.sections.map((s, i) => `${i + 1}. ${s}`).join("\n")}

Main visual: ${infographicSpec.key_visual_description}

Style requirements:
- Clean, minimalist government/policy report style
- Dark teal (#006B7D) and white color scheme
- Sans-serif typography
- Professional data visualization
- No photographs, pure infographic
- Include icons or simple charts where appropriate
- Leave space for a title at the top and source attribution at the bottom
- Wide landscape format suitable for policy documents`;

  try {
    const imageResponse = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt: imagePrompt,
        n: 1,
        size: "1792x1024",
        quality: "standard",
        response_format: "url",
      }),
    });

    if (!imageResponse.ok) {
      const errText = await imageResponse.text();
      console.error("[generate-policy-infographic] DALL-E error:", imageResponse.status, errText);
      throw new Error(`Image generation error: ${imageResponse.status}`);
    }

    const imageData = await imageResponse.json();
    const imageUrl = imageData.data?.[0]?.url;

    if (!imageUrl) {
      throw new Error("No image URL in DALL-E response");
    }

    // Download and store in paper-figures bucket for persistence
    let storedUrl = imageUrl;
    try {
      const imgRes = await fetch(imageUrl);
      const imgBuffer = await imgRes.arrayBuffer();
      const fileName = `policy-infographic-${paperId}-${Date.now()}.png`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("paper-figures")
        .upload(fileName, imgBuffer, { contentType: "image/png", upsert: false });

      if (!uploadError && uploadData) {
        const { data: publicData } = supabase.storage.from("paper-figures").getPublicUrl(fileName);
        storedUrl = publicData.publicUrl;
      }
    } catch (storageErr) {
      console.warn("[generate-policy-infographic] Storage upload failed, returning OpenAI URL:", storageErr);
    }

    return new Response(
      JSON.stringify({ success: true, image_url: storedUrl }),
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
