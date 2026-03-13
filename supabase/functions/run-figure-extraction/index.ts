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
  visual_description?: string;
  contextual_analysis?: string;
  sub_panels?: any[];
  citations?: any[];
  figure_extraction_status?: string;
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
  page_number?: number;
  figure_type?: string;
  key_findings?: string[];
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

/** Build the Gemini prompt with Phase 0 discovery */
function buildGeminiPrompt(figures: TextFigure[], sections: Section[], pageNumbers: number[]): string {
  const figureListing = figures.length > 0
    ? figures
        .map((f, i) => `${i + 1}. figure_id="${f.id}", caption: "${f.caption}", page: ${f.page_number}`)
        .join("\n")
    : "(No figures were identified during text extraction — you must discover them all visually)";

  const sectionText = sections
    .slice(0, 25)
    .map((s) => `[Section "${s.heading}" (pages ${s.page_numbers.join(",")})]: ${s.content.slice(0, 800)}`)
    .join("\n\n");

  const pageMapping = pageNumbers
    .map((p, i) => `Image ${i + 1} = page_image_id "page_${p}"`)
    .join(", ");

  return `You are analyzing PNG images of pages from a scientific paper. Each image is a full page rendered at 2x scale.

Page mapping: ${pageMapping}

## YOUR TASKS

### 0. DISCOVER ALL FIGURES (CRITICAL — DO THIS FIRST)
BEFORE processing the listed figures below, independently scan ALL provided page images.
Identify EVERY visual element on every page: charts, graphs, bar plots, line plots, scatter plots,
diagrams, microscopy images, photographs, schematics, maps, gel images, spectra, flowcharts,
tables with visual content, infographics, illustrations.

For each visual element found:
- Assign a figure_id following the pattern fig_1, fig_2, fig_3... (matching the numbering in the paper)
- Match to the listed figures below by page number and caption similarity
- If a visual element is NOT in the list below, ADD it as a new entry with its caption (read from the image), page_number, and figure_type

Listed figures from text extraction (may be incomplete or empty):

${figureListing}

### 1. LOCATE ALL FIGURES — Use code_execution with PIL/Pillow
Use Python code_execution to:
- Open each page image with PIL
- Compute the image dimensions (width, height)
- Identify each figure's bounding region on its page (including discovered figures)
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
    "contextual_analysis": "The authors use Figure 1 to demonstrate the relationship between X and Y...",
    "figure_role": "contextualization",
    "page_number": 3,
    "figure_type": "bar_chart",
    "key_findings": ["Finding 1", "Finding 2"],
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
        "explanation": "Panel a shows the untreated surface...",
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
- Even if you cannot precisely locate a figure, still return it with visual_description and contextual_analysis
- You MUST return ALL figures you discover, not just the ones listed above
- Include page_number, figure_type, and key_findings for each figure`;
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

const MAX_SERVER_RETRIES = 3;
const RETRY_BASE_MS = 5000;

/** Call Gemini with page PNG images + code_execution, with server-side retry for 429/503 */
async function callGeminiWithRetry(
  googleApiKey: string,
  pageImageData: { page_number: number; base64: string }[],
  figures: TextFigure[],
  sections: Section[],
): Promise<{ results: GeminiFigureResult[] | null; unavailable: boolean; error?: string }> {
  const pageNumbers = pageImageData.map((p) => p.page_number);
  const prompt = buildGeminiPrompt(figures, sections, pageNumbers);

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

  for (let attempt = 1; attempt <= MAX_SERVER_RETRIES; attempt++) {
    console.log(`[figure-extraction] Gemini attempt ${attempt}/${MAX_SERVER_RETRIES} with ${pageImageData.length} PNGs, ${figures.length} text-identified figures`);

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${googleApiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: requestBody,
        },
      );

      if (response.status === 429 || response.status === 503) {
        const errText = await response.text();
        console.warn(`[figure-extraction] Gemini ${response.status} (attempt ${attempt}): ${errText.slice(0, 200)}`);

        if (attempt === MAX_SERVER_RETRIES) {
          return { results: null, unavailable: true, error: `Gemini API returned ${response.status} after ${MAX_SERVER_RETRIES} attempts` };
        }

        const delay = RETRY_BASE_MS * Math.pow(2, attempt - 1) + Math.random() * 3000;
        console.log(`[figure-extraction] Retrying in ${Math.round(delay / 1000)}s...`);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }

      if (!response.ok) {
        const errText = await response.text();
        console.error(`[figure-extraction] Gemini API error: ${response.status}`, errText);
        return { results: null, unavailable: false, error: `Gemini API error: ${response.status}` };
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
        if (attempt === MAX_SERVER_RETRIES) {
          return { results: null, unavailable: false, error: "Gemini returned empty output" };
        }
        continue;
      }

      const parsed = extractJsonArray(rawText);
      if (!parsed || parsed.length === 0) {
        console.error("[figure-extraction] Failed to parse Gemini response:", rawText.slice(0, 500));
        return { results: null, unavailable: false, error: "Failed to parse figure results from Gemini" };
      }

      return { results: parsed, unavailable: false };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[figure-extraction] Gemini fetch error (attempt ${attempt}):`, msg);
      if (attempt === MAX_SERVER_RETRIES) {
        return { results: null, unavailable: true, error: msg };
      }
      const delay = RETRY_BASE_MS * Math.pow(2, attempt - 1) + Math.random() * 3000;
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  return { results: null, unavailable: true, error: "Exhausted retries" };
}

/** Extract page number from page_image_id like "page_3" → 3 */
function pageNumberFromImageId(pageImageId: string): number {
  const match = pageImageId.match(/page_(\d+)/);
  return match ? parseInt(match[1], 10) : 1;
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

    if (!googleApiKey) {
      console.warn("[figure-extraction] GOOGLE_API_KEY not set — skipping");
      return new Response(
        JSON.stringify({ success: false, retryable: false, message: "GOOGLE_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 1. Fetch figures and sections (figures may be empty — that's OK now)
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

    // NO early exit — even if figures.length === 0, Gemini will discover them visually

    console.log(`[figure-extraction] Paper ${paper_id}: ${figures.length} text-identified figures, ${page_images.length} page images, sending ALL to Gemini for discovery`);

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
        JSON.stringify({ error: "Failed to download any page images", retryable: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log(`[figure-extraction] Downloaded ${pageImageData.length} page PNGs`);

    // 3. Build regex-based citation map as fallback
    const regexCitationMap = buildCitationMapFromSections(sections);

    // 4. Call Gemini with server-side retry — Gemini will DISCOVER + LOCATE + ANALYZE
    const { results: geminiResults, unavailable, error: geminiError } = await callGeminiWithRetry(
      googleApiKey,
      pageImageData,
      figures,
      sections,
    );

    if (!geminiResults) {
      if (unavailable) {
        const updatedFiguresWithStatus = figures.map((fig) => ({
          ...fig,
          figure_extraction_status: "unavailable",
        }));
        await supabase
          .from("structured_papers")
          .update({ figures: updatedFiguresWithStatus })
          .eq("paper_id", paper_id);

        console.warn(`[figure-extraction] Marked as unavailable for paper ${paper_id}: ${geminiError}`);
        return new Response(
          JSON.stringify({
            success: false,
            retryable: true,
            unavailable: true,
            error: geminiError,
            figures_extracted: 0,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      return new Response(
        JSON.stringify({
          success: false,
          retryable: false,
          error: geminiError,
          figures_extracted: 0,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 5. Build a map of Gemini results by figure_id
    const geminiMap = new Map<string, GeminiFigureResult>();
    for (const result of geminiResults) {
      geminiMap.set(result.figure_id, result);
    }

    console.log(`[figure-extraction] Gemini returned ${geminiMap.size} figures (discovered + matched)`);

    // 6. Merge: update existing text-identified figures with Gemini data
    const matchedGeminiIds = new Set<string>();

    const updatedFigures: TextFigure[] = figures.map((fig) => {
      const gemini = geminiMap.get(fig.id);
      if (gemini) matchedGeminiIds.add(fig.id);

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
          page_number: gemini.page_number || fig.page_number,
          figure_type: gemini.figure_type || fig.figure_type,
          key_findings: gemini.key_findings && gemini.key_findings.length > 0 ? gemini.key_findings : fig.key_findings,
          sub_panels: (gemini.sub_panels || []).map((p) => ({
            panel_id: p.panel_id,
            label: p.label,
            description: p.description,
            explanation: p.explanation || undefined,
            image_url: null,
            bounding_box: p.bounding_box || undefined,
          })),
          citations: mergedCitations.length > 0 ? mergedCitations : undefined,
          figure_extraction_status: "complete",
        };
      }

      return {
        ...fig,
        citations: regexCitations.length > 0 ? regexCitations : undefined,
      };
    });

    // 7. Append Gemini-discovered figures NOT matched to any existing text figure
    for (const [geminiId, geminiResult] of geminiMap.entries()) {
      if (matchedGeminiIds.has(geminiId)) continue;

      // This is a new discovery — Gemini found a figure that GPT-4o missed
      const regexCitations = regexCitationMap.get(geminiId) || [];
      let mergedCitations = [...regexCitations];

      if (geminiResult.citations) {
        const geminiCitations = geminiResult.citations.map((c) => ({
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

      const pageNum = geminiResult.page_number
        || (geminiResult.bounding_box?.page_image_id ? pageNumberFromImageId(geminiResult.bounding_box.page_image_id) : 1);

      const newFigure: TextFigure = {
        id: geminiId,
        caption: geminiResult.caption || `Figure (discovered on page ${pageNum})`,
        description: geminiResult.visual_description || "",
        visual_description: geminiResult.visual_description || "",
        contextual_analysis: geminiResult.contextual_analysis || undefined,
        page_number: pageNum,
        key_findings: geminiResult.key_findings || [],
        figure_type: geminiResult.figure_type || "unknown",
        bounding_box: geminiResult.bounding_box || undefined,
        sub_panels: (geminiResult.sub_panels || []).map((p) => ({
          panel_id: p.panel_id,
          label: p.label,
          description: p.description,
          explanation: p.explanation || undefined,
          image_url: null,
          bounding_box: p.bounding_box || undefined,
        })),
        citations: mergedCitations.length > 0 ? mergedCitations : undefined,
        figure_extraction_status: "complete",
      };

      updatedFigures.push(newFigure);
      console.log(`[figure-extraction] Discovered new figure: ${geminiId} on page ${pageNum}`);
    }

    // 8. Save to structured_papers
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
    const discoveredCount = geminiMap.size - matchedGeminiIds.size;

    console.log(`[figure-extraction] Done: ${figuresWithBoxes} with bounding boxes, ${discoveredCount} newly discovered`);

    return new Response(
      JSON.stringify({
        success: true,
        figures_extracted: figuresWithBoxes,
        total_figures: updatedFigures.length,
        discovered_figures: discoveredCount,
        text_identified_figures: figures.length,
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
