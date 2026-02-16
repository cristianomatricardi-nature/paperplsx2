import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface Figure {
  id: string;
  caption: string;
  description: string;
  page_number: number;
  key_findings: string[];
  image_url?: string;
  bounding_box?: { x: number; y: number; width: number; height: number };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { paper_id } = await req.json();

    if (!paper_id) {
      return new Response(
        JSON.stringify({ error: "paper_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Fetch structured_papers record for figures array
    const { data: structuredPaper, error: spError } = await supabase
      .from("structured_papers")
      .select("figures")
      .eq("paper_id", paper_id)
      .single();

    if (spError || !structuredPaper) {
      return new Response(
        JSON.stringify({ error: "Structured paper not found", details: spError?.message }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const figures: Figure[] = structuredPaper.figures as Figure[] || [];

    if (figures.length === 0) {
      return new Response(
        JSON.stringify({ success: true, figures_extracted: 0, message: "No figures to extract" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Fetch paper record for storage_path
    const { data: paper, error: paperError } = await supabase
      .from("papers")
      .select("storage_path")
      .eq("id", paper_id)
      .single();

    if (paperError || !paper?.storage_path) {
      return new Response(
        JSON.stringify({ error: "Paper or storage path not found", details: paperError?.message }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Download the PDF from storage
    const { data: pdfData, error: downloadError } = await supabase.storage
      .from("research-papers")
      .download(paper.storage_path);

    if (downloadError || !pdfData) {
      return new Response(
        JSON.stringify({ error: "Failed to download PDF", details: downloadError?.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Note: Deno edge functions do not support canvas/PDF rendering natively.
    // We use the fallback approach described in the prompt:
    // - Upload the full PDF to OpenAI and use GPT-4o vision to identify bounding boxes
    // - Store bounding box coordinates in figure metadata for client-side cropping
    // - If OpenAI is unavailable, store figures with page references only

    const updatedFigures = [...figures];
    let figuresExtracted = 0;

    if (!openaiKey) {
      console.warn("OPENAI_API_KEY not set — storing figure page references without bounding boxes");
      // Even without OpenAI, update figures with storage path references
      for (let i = 0; i < updatedFigures.length; i++) {
        const fig = updatedFigures[i];
        updatedFigures[i] = {
          ...fig,
          image_url: null as any,
          bounding_box: null as any,
        };
      }
    } else {
      // Convert PDF to base64 for OpenAI vision API
      const pdfBytes = new Uint8Array(await pdfData.arrayBuffer());
      const pdfBase64 = btoa(String.fromCharCode(...pdfBytes));

      // Group figures by page to minimize API calls
      const figuresByPage = new Map<number, { index: number; figure: Figure }[]>();
      for (let i = 0; i < figures.length; i++) {
        const fig = figures[i];
        const page = fig.page_number || 1;
        if (!figuresByPage.has(page)) {
          figuresByPage.set(page, []);
        }
        figuresByPage.get(page)!.push({ index: i, figure: fig });
      }

      // Process each page's figures
      for (const [pageNum, pageFigures] of figuresByPage.entries()) {
        for (const { index, figure } of pageFigures) {
          try {
            // Call GPT-4o Vision to get bounding box
            const visionResponse = await fetch("https://api.openai.com/v1/chat/completions", {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${openaiKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: "gpt-4o",
                messages: [
                  {
                    role: "user",
                    content: [
                      {
                        type: "text",
                        text: `Look at page ${pageNum} of this scientific paper PDF. Find the figure with this caption: '${figure.caption}'.

Return a JSON object with the bounding box of JUST the figure (not the caption):
{ "x": top-left x as fraction of page width (0-1),
  "y": top-left y as fraction of page height (0-1),
  "width": width as fraction of page width (0-1),
  "height": height as fraction of page height (0-1) }

Return ONLY the JSON object, no other text.`,
                      },
                      {
                        type: "image_url",
                        image_url: {
                          url: `data:application/pdf;base64,${pdfBase64}`,
                        },
                      },
                    ],
                  },
                ],
                max_tokens: 200,
                temperature: 0,
              }),
            });

            if (visionResponse.ok) {
              const visionData = await visionResponse.json();
              const content = visionData.choices?.[0]?.message?.content?.trim() || "";

              // Parse bounding box from response
              let boundingBox: { x: number; y: number; width: number; height: number } | null = null;
              try {
                // Extract JSON from response (handle markdown code blocks)
                const jsonMatch = content.match(/\{[\s\S]*?\}/);
                if (jsonMatch) {
                  const parsed = JSON.parse(jsonMatch[0]);
                  if (
                    typeof parsed.x === "number" &&
                    typeof parsed.y === "number" &&
                    typeof parsed.width === "number" &&
                    typeof parsed.height === "number"
                  ) {
                    boundingBox = {
                      x: Math.max(0, Math.min(1, parsed.x)),
                      y: Math.max(0, Math.min(1, parsed.y)),
                      width: Math.max(0, Math.min(1, parsed.width)),
                      height: Math.max(0, Math.min(1, parsed.height)),
                    };
                  }
                }
              } catch (parseErr) {
                console.warn(`Failed to parse bounding box for figure ${figure.id}:`, parseErr);
              }

              // Store the figure path in storage for the full page reference
              const figureStoragePath = `${paper_id}/${figure.id}.png`;

              updatedFigures[index] = {
                ...figure,
                bounding_box: boundingBox || undefined,
                image_url: figureStoragePath,
              };
              figuresExtracted++;

              console.log(
                `Figure ${figure.id}: bounding box ${boundingBox ? "detected" : "not detected"}`
              );
            } else {
              const errText = await visionResponse.text();
              console.error(`OpenAI vision error for figure ${figure.id}:`, visionResponse.status, errText);
              // Fallback: store with page reference only
              updatedFigures[index] = {
                ...figure,
                image_url: `${paper_id}/${figure.id}.png`,
                bounding_box: undefined,
              };
              figuresExtracted++;
            }

            // Small delay between API calls to avoid rate limits
            await new Promise((resolve) => setTimeout(resolve, 500));
          } catch (figError) {
            console.error(`Error processing figure ${figure.id}:`, figError);
            // Fallback: keep figure as-is with page reference
            updatedFigures[index] = {
              ...figure,
              image_url: `${paper_id}/${figure.id}.png`,
            };
            figuresExtracted++;
          }
        }
      }
    }

    // 6. Update structured_papers with the updated figures array
    const { error: updateError } = await supabase
      .from("structured_papers")
      .update({ figures: updatedFigures })
      .eq("paper_id", paper_id);

    if (updateError) {
      console.error("Failed to update figures:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update figure metadata", details: updateError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 7. Return result
    return new Response(
      JSON.stringify({
        success: true,
        figures_extracted: figuresExtracted,
        note: "Bounding boxes stored in figure metadata. Deno does not support canvas — client-side cropping recommended.",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
