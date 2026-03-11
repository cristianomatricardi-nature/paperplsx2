import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface TextFigure {
  id: string;
  caption: string;
  description: string;
  page_number: number;
  key_findings: string[];
  figure_type?: string;
  data_series?: string[];
  image_url?: string | null;
}

interface Section {
  id: string;
  heading: string;
  content: string;
  page_numbers: number[];
}

interface GeminiFigureResult {
  figure_id: string;
  caption: string;
  visual_description: string;
  full_image_base64?: string;
  sub_panels: {
    panel_id: string;
    label: string;
    description: string;
    image_base64?: string;
  }[];
  citations: {
    text_snippet: string;
    section_heading: string;
    page_number: number;
  }[];
}

/** Convert Uint8Array to base64 without stack overflow (chunked). */
function uint8ToBase64(bytes: Uint8Array): string {
  const CHUNK = 8192;
  let binary = "";
  for (let i = 0; i < bytes.length; i += CHUNK) {
    const slice = bytes.subarray(i, Math.min(i + CHUNK, bytes.length));
    for (let j = 0; j < slice.length; j++) {
      binary += String.fromCharCode(slice[j]);
    }
  }
  return btoa(binary);
}

/** Decode base64 to Uint8Array */
function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/** Build the Gemini prompt */
function buildGeminiPrompt(figures: TextFigure[], sections: Section[]): string {
  const figureListing = figures
    .map((f, i) => `${i + 1}. figure_id="${f.id}", caption: "${f.caption}", page: ${f.page_number}`)
    .join("\n");

  const sectionText = sections
    .slice(0, 20)
    .map((s) => `[Section "${s.heading}" (pages ${s.page_numbers.join(",")})]: ${s.content.slice(0, 500)}`)
    .join("\n\n");

  return `You are analyzing a scientific paper PDF. The paper contains the following figures identified during text extraction:

${figureListing}

Your tasks:
1. **Extract each figure**: Use Python code_execution to extract/crop each figure from the PDF pages. Return the cropped image as base64 PNG. If a figure has sub-panels (e.g., "a", "b", "c"), also crop each sub-panel individually.

2. **Describe visually**: For each figure, provide a detailed visual_description of what you see (axes, trends, data patterns, colors, chart types).

3. **Find citations**: Search the following paper sections for references to each figure (e.g., "Fig. 1", "Figure 1a", "Fig. 1(b)"). Return the surrounding sentence, the section heading, and the page number.

Paper sections for citation scanning:
${sectionText}

Return a JSON array (no markdown fences, no extra text):
[
  {
    "figure_id": "fig_1",
    "caption": "Figure 1. ...",
    "visual_description": "A bar chart showing...",
    "full_image_base64": "<base64 PNG of the full figure>",
    "sub_panels": [
      {
        "panel_id": "fig_1a",
        "label": "a",
        "description": "SEM micrograph showing...",
        "image_base64": "<base64 PNG of sub-panel a>"
      }
    ],
    "citations": [
      {
        "text_snippet": "As shown in Fig. 1a, the morphology...",
        "section_heading": "Results",
        "page_number": 5
      }
    ]
  }
]

Rules:
- Use Python (PIL/Pillow) via code_execution to crop figures from the rendered PDF pages
- Sub-panels are labeled parts within a figure (a, b, c, etc.) — detect them visually
- If no sub-panels exist, return an empty sub_panels array
- Return ONLY the JSON array
- All base64 strings should be raw base64 without data URI prefix
- If you cannot crop a figure, still return the entry with visual_description and citations but omit full_image_base64`;
}

/** Call Gemini with the full PDF as inline_data */
async function callGemini(
  googleApiKey: string,
  pdfBase64: string,
  figures: TextFigure[],
  sections: Section[],
): Promise<GeminiFigureResult[]> {
  const prompt = buildGeminiPrompt(figures, sections);

  console.log(`[figure-extraction] Calling Gemini with ${figures.length} figures to extract`);

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${googleApiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [
            { inline_data: { mime_type: "application/pdf", data: pdfBase64 } },
            { text: prompt },
          ],
        }],
        tools: [{ code_execution: {} }],
        generationConfig: {
          temperature: 0.2,
        },
      }),
    },
  );

  if (!response.ok) {
    const errText = await response.text();
    console.error(`[figure-extraction] Gemini API error: ${response.status}`, errText);
    return [];
  }

  const data = await response.json();

  // Extract text from response parts
  let rawText = "";
  const candidates = data.candidates || [];
  for (const candidate of candidates) {
    const parts = candidate.content?.parts || [];
    for (const part of parts) {
      if (part.text) rawText += part.text;
    }
  }

  if (!rawText.trim()) {
    console.warn("[figure-extraction] Empty response from Gemini");
    return [];
  }

  // Parse JSON
  try {
    const jsonStr = rawText.replace(/```json?\s*/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(jsonStr);
    if (Array.isArray(parsed)) return parsed;
    return [];
  } catch (err) {
    console.error("[figure-extraction] Failed to parse Gemini response:", err, rawText.slice(0, 500));
    return [];
  }
}

/** Upload a base64 PNG to storage and return the public URL */
async function uploadPng(
  supabase: ReturnType<typeof createClient>,
  supabaseUrl: string,
  paperId: number,
  filename: string,
  base64Data: string,
): Promise<string | null> {
  try {
    const bytes = base64ToUint8Array(base64Data);
    const path = `${paperId}/${filename}`;

    const { error } = await supabase.storage
      .from("paper-figures")
      .upload(path, bytes, {
        contentType: "image/png",
        upsert: true,
      });

    if (error) {
      console.error(`[figure-extraction] Upload failed for ${path}:`, error);
      return null;
    }

    return `${supabaseUrl}/storage/v1/object/public/paper-figures/${path}`;
  } catch (err) {
    console.error(`[figure-extraction] Upload error for ${filename}:`, err);
    return null;
  }
}

/** Build citation mapping from sections using regex */
function buildCitationMapFromSections(sections: Section[]): Map<string, { text_snippet: string; section_id: string; page_number: number }[]> {
  const citationMap = new Map<string, { text_snippet: string; section_id: string; page_number: number }[]>();
  const figRegex = /(?:Fig(?:ure|\.)\s*(\d+)\s*([a-z])?)/gi;

  for (const section of sections) {
    const sentences = section.content.split(/(?<=[.!?])\s+/);
    for (const sentence of sentences) {
      let match: RegExpExecArray | null;
      figRegex.lastIndex = 0;
      while ((match = figRegex.exec(sentence)) !== null) {
        const figNum = match[1];
        const panelLabel = match[2] || "";
        const figId = panelLabel ? `fig_${figNum}${panelLabel}` : `fig_${figNum}`;

        if (!citationMap.has(figId)) citationMap.set(figId, []);
        citationMap.get(figId)!.push({
          text_snippet: sentence.trim().slice(0, 200),
          section_id: section.id,
          page_number: section.page_numbers?.[0] || 0,
        });
      }
    }
  }

  return citationMap;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const googleApiKey = Deno.env.get("GOOGLE_API_KEY");
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { paper_id } = await req.json();

    if (!paper_id) {
      return new Response(
        JSON.stringify({ error: "paper_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 1. Fetch figures and sections from structured_papers
    const { data: sp, error: spErr } = await supabase
      .from("structured_papers")
      .select("figures, sections")
      .eq("paper_id", paper_id)
      .single();

    if (spErr || !sp) {
      return new Response(
        JSON.stringify({ error: "Structured paper not found", details: spErr?.message }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const figures: TextFigure[] = (sp.figures as TextFigure[]) || [];
    const sections: Section[] = (sp.sections as Section[]) || [];

    if (figures.length === 0) {
      return new Response(
        JSON.stringify({ success: true, figures_extracted: 0, message: "No figures to extract" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!googleApiKey) {
      console.warn("[figure-extraction] GOOGLE_API_KEY not set — skipping figure extraction");
      return new Response(
        JSON.stringify({ success: true, figures_extracted: 0, message: "GOOGLE_API_KEY not configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 2. Download PDF
    const { data: paper, error: paperErr } = await supabase
      .from("papers")
      .select("storage_path")
      .eq("id", paper_id)
      .single();

    if (paperErr || !paper?.storage_path) {
      return new Response(
        JSON.stringify({ error: "Paper or storage path not found", details: paperErr?.message }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: pdfData, error: dlErr } = await supabase.storage
      .from("research-papers")
      .download(paper.storage_path);

    if (dlErr || !pdfData) {
      return new Response(
        JSON.stringify({ error: "Failed to download PDF", details: dlErr?.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const pdfBytes = new Uint8Array(await pdfData.arrayBuffer());
    const pdfBase64 = uint8ToBase64(pdfBytes);
    console.log(`[figure-extraction] PDF: ${pdfBytes.length} bytes, ${figures.length} figures`);

    // 3. Build regex-based citation map from sections
    const regexCitationMap = buildCitationMapFromSections(sections);

    // 4. Call Gemini with full PDF
    const geminiResults = await callGemini(googleApiKey, pdfBase64, figures, sections);
    const allGeminiResults = new Map<string, GeminiFigureResult>();
    let totalUploaded = 0;

    for (const result of geminiResults) {
      allGeminiResults.set(result.figure_id, result);

      // Upload full figure image
      if (result.full_image_base64) {
        const url = await uploadPng(supabase, supabaseUrl, paper_id, `${result.figure_id}.png`, result.full_image_base64);
        if (url) {
          result.full_image_base64 = "";
          (result as any)._image_url = url;
          totalUploaded++;
        }
      }

      // Upload sub-panel images
      for (const panel of result.sub_panels || []) {
        if (panel.image_base64) {
          const url = await uploadPng(supabase, supabaseUrl, paper_id, `${panel.panel_id}.png`, panel.image_base64);
          if (url) {
            panel.image_base64 = "";
            (panel as any)._image_url = url;
            totalUploaded++;
          }
        }
      }
    }

    console.log(`[figure-extraction] Gemini returned ${allGeminiResults.size} figures, uploaded ${totalUploaded} images`);

    // 5. Merge Gemini results with existing figures
    const updatedFigures = figures.map((fig) => {
      const gemini = allGeminiResults.get(fig.id);

      // Merge regex citations with Gemini citations
      const regexCitations = regexCitationMap.get(fig.id) || [];
      let mergedCitations = [...regexCitations];

      if (gemini?.citations) {
        const geminiCitations = gemini.citations.map((c) => ({
          text_snippet: c.text_snippet,
          section_id: sections.find((s) => s.heading.toLowerCase().includes(c.section_heading?.toLowerCase() || ""))?.id,
          page_number: c.page_number,
        }));
        const existing = new Set(mergedCitations.map((c) => c.text_snippet.slice(0, 50)));
        for (const gc of geminiCitations) {
          if (!existing.has(gc.text_snippet.slice(0, 50))) {
            mergedCitations.push(gc);
          }
        }
      }

      if (gemini) {
        return {
          ...fig,
          image_url: (gemini as any)._image_url || fig.image_url,
          visual_description: gemini.visual_description || fig.description,
          sub_panels: (gemini.sub_panels || []).map((p) => ({
            panel_id: p.panel_id,
            label: p.label,
            description: p.description,
            image_url: (p as any)._image_url || null,
          })),
          citations: mergedCitations.length > 0 ? mergedCitations : undefined,
        };
      }

      return {
        ...fig,
        citations: regexCitations.length > 0 ? regexCitations : undefined,
      };
    });

    // 6. Save to structured_papers
    const { error: updateErr } = await supabase
      .from("structured_papers")
      .update({ figures: updatedFigures })
      .eq("paper_id", paper_id);

    if (updateErr) {
      console.error("[figure-extraction] Failed to update figures:", updateErr);
      return new Response(
        JSON.stringify({ error: "Failed to update figure metadata", details: updateErr.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        figures_extracted: allGeminiResults.size,
        images_uploaded: totalUploaded,
        total_figures: figures.length,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[figure-extraction] Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
