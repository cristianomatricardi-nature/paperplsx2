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

interface PageImage {
  page_number: number;
  storage_path: string;
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

/** Decode base64 to Uint8Array, sanitizing data URI prefixes and whitespace */
function base64ToUint8Array(base64: string): Uint8Array {
  // Strip data URI prefix if present
  const cleaned = base64
    .replace(/^data:image\/[a-z]+;base64,/i, "")
    .replace(/\s/g, "");
  const binaryString = atob(cleaned);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/** Build the Gemini prompt for PNG page images */
function buildGeminiPrompt(figures: TextFigure[], sections: Section[], pageNumbers: number[]): string {
  const figureListing = figures
    .map((f, i) => `${i + 1}. figure_id="${f.id}", caption: "${f.caption}", page: ${f.page_number}`)
    .join("\n");

  const sectionText = sections
    .slice(0, 20)
    .map((s) => `[Section "${s.heading}" (pages ${s.page_numbers.join(",")})]: ${s.content.slice(0, 500)}`)
    .join("\n\n");

  return `You are analyzing PNG images of pages from a scientific paper. Each image is a full page rendered at 2x scale. The pages provided are: ${pageNumbers.join(", ")}.

The paper contains these figures (identified during text extraction):

${figureListing}

Your tasks:

1. **Crop each figure** from the page images using Python code_execution with PIL/Pillow:
   - Identify each figure on its page image
   - Crop the figure region (include the full figure with axes, legends, labels — but NOT the caption text below)
   - If a figure has sub-panels (a, b, c, etc.), also crop each sub-panel individually
   - Return each cropped image as base64-encoded PNG
   - IMPORTANT: The page images are provided in order. Image 1 = page ${pageNumbers[0] || 1}, Image 2 = page ${pageNumbers[1] || "..."}, etc.

2. **Describe visually**: For each figure, provide a detailed visual_description of what you see (axes, trends, data patterns, colors, chart types).

3. **Find citations**: Search the following paper sections for references to each figure (e.g., "Fig. 1", "Figure 1a"). Return the surrounding sentence, the section heading, and the page number.

Paper sections for citation scanning:
${sectionText}

Return a JSON array (no markdown fences):
[
  {
    "figure_id": "fig_1",
    "caption": "Figure 1. ...",
    "visual_description": "A bar chart showing...",
    "full_image_base64": "<base64 PNG of the cropped full figure>",
    "sub_panels": [
      {
        "panel_id": "fig_1a",
        "label": "a",
        "description": "SEM micrograph showing...",
        "image_base64": "<base64 PNG of cropped sub-panel a>"
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
- Use Python (PIL/Pillow) via code_execution to crop figures from the page images
- Each page image corresponds to one page of the PDF
- Sub-panels are labeled parts within a figure (a, b, c, etc.) — detect them visually
- If no sub-panels exist, return an empty sub_panels array
- Return ONLY the JSON array after all code execution
- All base64 strings should be raw base64 without data URI prefix
- If you cannot crop a figure, still return the entry with visual_description and citations but omit full_image_base64`;
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
    // Validate minimum PNG size (8-byte header)
    if (bytes.length < 8) {
      console.warn(`[figure-extraction] Skipping ${filename}: decoded size too small (${bytes.length} bytes)`);
      return null;
    }
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

/** Retry wrapper with exponential backoff + jitter for transient errors */
async function withRetry<T>(
  fn: () => Promise<T>,
  opts: { maxAttempts?: number; baseDelay?: number; label?: string } = {},
): Promise<T> {
  const { maxAttempts = 4, baseDelay = 2000, label = "operation" } = opts;
  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt === maxAttempts) break;
      const jitter = Math.random() * 1000;
      const delay = baseDelay * Math.pow(2, attempt - 1) + jitter;
      console.warn(`[figure-extraction] ${label} attempt ${attempt}/${maxAttempts} failed, retrying in ${Math.round(delay)}ms...`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
}

/** Robustly extract a JSON array from mixed text/code_execution output */
function extractJsonArray(raw: string): GeminiFigureResult[] | null {
  // Strip markdown fences
  let cleaned = raw.replace(/```json?\s*/g, "").replace(/```/g, "").trim();

  // Try direct parse
  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) return parsed;
    // Handle { extracted_figures: [...] } wrapper
    if (parsed && typeof parsed === "object") {
      for (const key of Object.keys(parsed)) {
        if (Array.isArray(parsed[key])) return parsed[key];
      }
    }
    return null;
  } catch {
    // Try to find a JSON array in the text
    const arrayMatch = cleaned.match(/\[\s*\{[\s\S]*\}\s*\]/);
    if (arrayMatch) {
      try {
        return JSON.parse(arrayMatch[0]);
      } catch { /* fall through */ }
    }
    return null;
  }
}

/** Call Gemini with page PNG images + code_execution, with retries */
async function callGemini(
  googleApiKey: string,
  pageImageData: { page_number: number; base64: string }[],
  figures: TextFigure[],
  sections: Section[],
): Promise<GeminiFigureResult[]> {
  const pageNumbers = pageImageData.map((p) => p.page_number);
  const prompt = buildGeminiPrompt(figures, sections, pageNumbers);

  console.log(`[figure-extraction] Calling Gemini with ${pageImageData.length} page PNGs, ${figures.length} figures`);

  // Build parts: all page images as inline_data, then the prompt
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

  // Retry wrapper for the actual API call
  const data = await withRetry(async () => {
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

    return await response.json();
  }, { maxAttempts: 4, baseDelay: 3000, label: "Gemini API" });

  // Extract text from response parts
  let rawText = "";
  const candidates = data.candidates || [];
  for (const candidate of candidates) {
    const cParts = candidate.content?.parts || [];
    for (const part of cParts) {
      if (part.text) rawText = part.text;
      if (part.codeExecutionResult?.output) {
        // Prefer code execution output if it contains JSON
        const execOutput = part.codeExecutionResult.output;
        if (execOutput.includes("[") || execOutput.includes("{")) {
          rawText = execOutput;
        }
      }
    }
  }

  if (!rawText.trim()) {
    console.warn("[figure-extraction] No usable output from Gemini after retries");
    throw new Error("Gemini returned empty output");
  }

  // Parse JSON robustly
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

    // 3. Build regex-based citation map
    const regexCitationMap = buildCitationMapFromSections(sections);

    // 4. Call Gemini with retries
    let geminiResults: GeminiFigureResult[];
    try {
      geminiResults = await callGemini(googleApiKey, pageImageData, figures, sections);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const isQuotaExceeded = /\b429\b/.test(msg) || /quota/i.test(msg);
      const retryable = !isQuotaExceeded;

      console.error(`[figure-extraction] Gemini failed after retries: ${msg}`);
      return new Response(
        JSON.stringify({
          success: false,
          retryable,
          error: msg,
          reason: isQuotaExceeded ? "quota_exceeded" : "model_unavailable",
          images_uploaded: 0,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

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

    // Treat 0 uploads as retryable soft failure (avoid non-2xx to prevent client crashes)
    if (totalUploaded === 0 && figures.length > 0) {
      console.warn("[figure-extraction] Gemini returned results but 0 images were uploaded");
      return new Response(
        JSON.stringify({ success: false, retryable: true, error: "No images could be extracted", images_uploaded: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 5. Merge Gemini results with existing figures
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
      JSON.stringify({ error: "Internal server error", retryable: false, details: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
