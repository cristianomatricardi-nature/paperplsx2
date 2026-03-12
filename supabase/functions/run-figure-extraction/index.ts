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
  bounding_box?: any;
}

interface Section {
  id: string;
  heading: string;
  content: string;
  page_numbers: number[];
}

interface PageImage {
  page_number: number;
  storage_path: string;
}

interface GeminiFigureResult {
  figure_id: string;
  caption: string;
  visual_description: string;
  contextual_analysis: string;
  bounding_box: {
    x: number;
    y: number;
    width: number;
    height: number;
    page_image_id: string;
  };
  sub_panels: {
    panel_id: string;
    label: string;
    description: string;
    explanation: string;
    bounding_box: {
      x: number;
      y: number;
      width: number;
      height: number;
      page_image_id: string;
    };
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

/** Build the Gemini prompt for PNG page images */
function buildGeminiPrompt(figures: TextFigure[], sections: Section[], pageNumbers: number[]): string {
  const figureListing = figures
    .map((f, i) => `${i + 1}. figure_id="${f.id}", caption: "${f.caption}", page: ${f.page_number}`)
    .join("\n");

  const sectionText = sections
    .slice(0, 25)
    .map((s) => `[Section "${s.heading}" (pages ${s.page_numbers.join(",")})]: ${s.content.slice(0, 800)}`)
    .join("\n\n");

  const pageMapping = pageNumbers
    .map((p, i) => `Image ${i + 1} = page_image_id "page_${p}"`)
    .join(", ");

  return `You are analyzing PNG images of pages from a scientific paper. Each image is a full page rendered at 2x scale.

Page mapping: ${pageMapping}

The paper contains these figures (identified during text extraction):

${figureListing}

## YOUR TASKS

### 1. LOCATE FIGURES — Use code_execution with PIL/Pillow
Use Python code_execution to:
- Open each page image with PIL
- Compute the image dimensions (width, height)
- Identify each figure's bounding region on its page
- If a figure has sub-panels (a, b, c, etc.), identify each sub-panel's bounding region
- Return bounding boxes as **normalized coordinates (0-1)** relative to the page image dimensions:
  - x = left_px / image_width
  - y = top_px / image_height
  - width = region_width_px / image_width
  - height = region_height_px / image_height
- Include the figure region (axes, legends, labels) but NOT the caption text below
- Each bounding_box MUST include a "page_image_id" field (e.g. "page_3") identifying which page image it belongs to

### 2. CONTEXTUAL ANALYSIS — Scan the paper text
Search the following paper sections for ALL references to each figure and sub-panel
(e.g. "Fig. 1a", "Figure 2", "shown in Fig. 3b", "as illustrated in Figure 1"):

${sectionText}

For each reference found:
- Extract the surrounding sentence
- Understand what the figure demonstrates scientifically
- What concepts, relationships, or data patterns it illustrates
- What conclusions the authors draw from it

Synthesize ALL references into:
- A rich "contextual_analysis" field per figure (how the paper uses and interprets this figure)
- A rich "visual_description" per figure (what you visually see: chart types, axes, trends, colors, data patterns)
- For each sub-panel, an "explanation" that combines visual observation with what the paper text says about it

### 3. CITATIONS — Return text references
For each figure reference found in the sections, return the snippet, section heading, and page number.

## OUTPUT FORMAT

Return a JSON array (NO markdown fences, just raw JSON):
[
  {
    "figure_id": "fig_1",
    "caption": "Figure 1. ...",
    "visual_description": "A bar chart showing X vs Y with three groups...",
    "contextual_analysis": "The authors use Figure 1 to demonstrate the relationship between X and Y. In the Results section, they note that... In the Discussion, they compare this to...",
    "bounding_box": {
      "x": 0.05,
      "y": 0.12,
      "width": 0.90,
      "height": 0.45,
      "page_image_id": "page_3"
    },
    "sub_panels": [
      {
        "panel_id": "fig_1a",
        "label": "a",
        "description": "SEM micrograph showing surface morphology at 10,000x magnification",
        "explanation": "Panel a shows the untreated surface. The authors note in Section 3.1 that the rough morphology indicates...",
        "bounding_box": {
          "x": 0.05,
          "y": 0.12,
          "width": 0.44,
          "height": 0.45,
          "page_image_id": "page_3"
        }
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

## RULES
- Use Python (PIL/Pillow) via code_execution to compute precise bounding boxes
- ALL coordinates must be normalized (0-1 range)
- Every bounding_box MUST include page_image_id
- DO NOT return any image data (no base64, no cropped images)
- If no sub-panels exist, return an empty sub_panels array
- Return ONLY the JSON array after all code execution
- Even if you cannot precisely locate a figure, still return it with visual_description and contextual_analysis`;
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

/** Robustly extract a JSON array from mixed text/code_execution output */
function extractJsonArray(raw: string): GeminiFigureResult[] | null {
  let cleaned = raw.replace(/```json?\s*/g, "").replace(/```/g, "").trim();

  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) return parsed;
    if (parsed && typeof parsed === "object") {
      for (const key of Object.keys(parsed)) {
        if (Array.isArray(parsed[key])) return parsed[key];
      }
    }
    return null;
  } catch {
    const arrayMatch = cleaned.match(/\[\s*\{[\s\S]*\}\s*\]/);
    if (arrayMatch) {
      try {
        return JSON.parse(arrayMatch[0]);
      } catch { /* fall through */ }
    }
    return null;
  }
}

/** Call Gemini with page PNG images + code_execution */
async function callGemini(
  googleApiKey: string,
  pageImageData: { page_number: number; base64: string }[],
  figures: TextFigure[],
  sections: Section[],
): Promise<GeminiFigureResult[]> {
  const pageNumbers = pageImageData.map((p) => p.page_number);
  const prompt = buildGeminiPrompt(figures, sections, pageNumbers);

  console.log(`[figure-extraction] Calling Gemini with ${pageImageData.length} page PNGs, ${figures.length} figures`);

  const parts: any[] = [];
  for (const page of pageImageData) {
    parts.push({
      inline_data: {
        mime_type: "image/png",
        data: page.base64,
      },
    });
  }
  parts.push({ text: prompt });

  const requestBody = JSON.stringify({
    contents: [{ parts }],
    tools: [{ code_execution: {} }],
    generationConfig: {
      temperature: 0.2,
    },
  });

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${googleApiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: requestBody,
    },
  );

  if (response.status === 503 || response.status === 429) {
    const errText = await response.text();
    console.warn(`[figure-extraction] Gemini ${response.status}: ${errText.slice(0, 200)}`);
    throw new Error(`Gemini API returned ${response.status}`);
  }

  if (!response.ok) {
    const errText = await response.text();
    console.error(`[figure-extraction] Gemini API error: ${response.status}`, errText);
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();

  let rawText = "";
  const candidates = data.candidates || [];
  for (const candidate of candidates) {
    const cParts = candidate.content?.parts || [];
    for (const part of cParts) {
      if (part.text) rawText = part.text;
      if (part.codeExecutionResult?.output) {
        const execOutput = part.codeExecutionResult.output;
        if (execOutput.includes("[") || execOutput.includes("{")) {
          rawText = execOutput;
        }
      }
    }
  }

  if (!rawText.trim()) {
    console.warn("[figure-extraction] No usable output from Gemini");
    throw new Error("Gemini returned empty output");
  }

  const parsed = extractJsonArray(rawText);
  if (!parsed || parsed.length === 0) {
    console.error("[figure-extraction] Failed to parse Gemini response:", rawText.slice(0, 500));
    throw new Error("Failed to parse figure results from Gemini");
  }

  return parsed;
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

    const body = await req.json();
    const { paper_id, page_images } = body as {
      paper_id: number;
      page_images?: PageImage[];
    };

    if (!paper_id) {
      return new Response(
        JSON.stringify({ error: "paper_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!page_images || page_images.length === 0) {
      console.log(`[figure-extraction] No page_images for paper ${paper_id} — deferring to client`);
      return new Response(
        JSON.stringify({ success: true, deferred: true, message: "Extraction deferred to client-side rendering" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 1. Fetch figures and sections
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
      console.warn("[figure-extraction] GOOGLE_API_KEY not set — skipping");
      return new Response(
        JSON.stringify({ success: false, retryable: false, message: "GOOGLE_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 2. Download page PNGs from storage
    const pageImageData: { page_number: number; base64: string }[] = [];

    for (const pi of page_images) {
      const { data: imgData, error: dlErr } = await supabase.storage
        .from("paper-figures")
        .download(pi.storage_path);

      if (dlErr || !imgData) {
        console.warn(`[figure-extraction] Failed to download page image ${pi.storage_path}:`, dlErr?.message);
        continue;
      }

      const bytes = new Uint8Array(await imgData.arrayBuffer());
      const base64 = uint8ToBase64(bytes);
      pageImageData.push({ page_number: pi.page_number, base64 });
    }

    if (pageImageData.length === 0) {
      return new Response(
        JSON.stringify({ error: "Failed to download any page images" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log(`[figure-extraction] Downloaded ${pageImageData.length} page PNGs, ${figures.length} figures`);

    // 3. Build regex-based citation map as fallback
    const regexCitationMap = buildCitationMapFromSections(sections);

    // 4. Call Gemini
    let geminiResults: GeminiFigureResult[];
    try {
      geminiResults = await callGemini(googleApiKey, pageImageData, figures, sections);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const isQuotaExceeded = /\b429\b/.test(msg) || /quota/i.test(msg);
      const retryable = !isQuotaExceeded;

      console.error(`[figure-extraction] Gemini failed: ${msg}`);
      return new Response(
        JSON.stringify({
          success: false,
          retryable,
          error: msg,
          reason: isQuotaExceeded ? "quota_exceeded" : "model_unavailable",
          figures_extracted: 0,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const allGeminiResults = new Map<string, GeminiFigureResult>();
    for (const result of geminiResults) {
      allGeminiResults.set(result.figure_id, result);
    }

    console.log(`[figure-extraction] Gemini returned ${allGeminiResults.size} figures with bounding boxes`);

    // 5. Merge Gemini results with existing figures (coordinates only, no images)
    const updatedFigures = figures.map((fig) => {
      const gemini = allGeminiResults.get(fig.id);

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
          visual_description: gemini.visual_description || fig.description,
          contextual_analysis: gemini.contextual_analysis || undefined,
          bounding_box: gemini.bounding_box || fig.bounding_box,
          sub_panels: (gemini.sub_panels || []).map((p) => ({
            panel_id: p.panel_id,
            label: p.label,
            description: p.description,
            explanation: p.explanation || undefined,
            image_url: null,
            bounding_box: p.bounding_box || undefined,
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

    const figuresWithBoxes = updatedFigures.filter((f) => f.bounding_box).length;

    return new Response(
      JSON.stringify({
        success: true,
        figures_extracted: figuresWithBoxes,
        total_figures: figures.length,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[figure-extraction] Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error", retryable: false, details: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
