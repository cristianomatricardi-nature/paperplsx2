import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { usePaperPdf } from '@/hooks/usePaperPdf';
import type { Figure } from '@/types/structured-paper';

const MAX_CLIENT_RETRIES = 3;
const RETRY_BASE_DELAY = 5000;

/**
 * Client-side fallback hook that:
 * 1. Checks if figures already have bounding_box (server extraction succeeded) → do nothing
 * 2. Ensures PNGs exist for ALL pages (not just figure pages) — renders via pdf.js if missing
 * 3. Calls run-figure-extraction edge function which discovers + locates all figures
 * 4. Calls onSuccess when extraction completes
 */
export function useFigureExtraction(
  paperId: number | null,
  figures: Figure[] | null,
  storagePath: string | null,
  onSuccess?: () => void,
) {
  const { renderPage } = usePaperPdf(storagePath);
  const triggeredRef = useRef(false);
  const onSuccessRef = useRef(onSuccess);

  // Keep onSuccess ref current without adding it to callback deps
  onSuccessRef.current = onSuccess;

  const runExtraction = useCallback(async () => {
    if (!paperId || !storagePath) return;

    // Check if extraction already succeeded (server-side) — figures may be null/empty if GPT-4o missed them
    const hasAnyBoundingBox = figures?.some((f) => f.bounding_box);
    if (hasAnyBoundingBox) {
      console.log('[useFigureExtraction] Figures already have bounding boxes, skipping');
      return;
    }

    // Check if marked as unavailable (API limit hit) — don't retry
    const isUnavailable = figures?.some((f: any) => f.figure_extraction_status === 'unavailable');
    if (isUnavailable) {
      console.log('[useFigureExtraction] Figure extraction marked as unavailable, skipping');
      return;
    }

    // Fetch num_pages from the paper record to render ALL pages
    const { data: paperData } = await supabase
      .from('papers')
      .select('num_pages')
      .eq('id', paperId)
      .single();

    const numPages = paperData?.num_pages || 1;

    // Build list of all page numbers
    const pageNumbers = Array.from({ length: numPages }, (_, i) => i + 1);

    console.log(
      `[useFigureExtraction] Fallback: ensuring PNGs for ALL ${pageNumbers.length} pages (${figures?.length ?? 0} text-identified figures)`,
    );

    // Ensure PNGs exist in storage for ALL pages
    const pageImages: { page_number: number; storage_path: string }[] = [];

    for (const pageNum of pageNumbers) {
      const path = `${paperId}/page_${pageNum}.png`;

      // Check if PNG already exists
      const { data: existing } = await supabase.storage
        .from('paper-figures')
        .list(`${paperId}`, { search: `page_${pageNum}.png` });

      if (existing && existing.length > 0) {
        pageImages.push({ page_number: pageNum, storage_path: path });
        continue;
      }

      // PNG missing — render and upload
      try {
        const canvas = await renderPage(pageNum, 2);
        if (!canvas) {
          console.warn(`[useFigureExtraction] Failed to render page ${pageNum}`);
          continue;
        }

        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob((b) => resolve(b), 'image/png'),
        );
        if (!blob) continue;

        const { error: uploadErr } = await supabase.storage
          .from('paper-figures')
          .upload(path, blob, {
            contentType: 'image/png',
            upsert: true,
          });

        if (uploadErr) {
          console.warn(`[useFigureExtraction] Upload failed for page ${pageNum}:`, uploadErr.message);
          continue;
        }

        pageImages.push({ page_number: pageNum, storage_path: path });
      } catch (err) {
        console.warn(`[useFigureExtraction] Error processing page ${pageNum}:`, err);
      }
    }

    if (pageImages.length === 0) {
      console.warn('[useFigureExtraction] No page images available, skipping extraction');
      return;
    }

    // Retry loop for the edge function call
    for (let attempt = 1; attempt <= MAX_CLIENT_RETRIES; attempt++) {
      console.log(`[useFigureExtraction] Calling edge function (attempt ${attempt}/${MAX_CLIENT_RETRIES}) with ${pageImages.length} pages`);

      let data: any = null;
      let fnErr: any = null;

      try {
        const result = await supabase.functions.invoke('run-figure-extraction', {
          body: { paper_id: paperId, page_images: pageImages },
        });
        data = result.data;
        fnErr = result.error;
      } catch (err) {
        console.warn(`[useFigureExtraction] Edge function threw (attempt ${attempt}):`, err);
        fnErr = err;
      }

      if (fnErr) {
        console.error(`[useFigureExtraction] Edge function error (attempt ${attempt}):`, fnErr);
      }

      const responseData = data as { success?: boolean; retryable?: boolean; figures_extracted?: number; unavailable?: boolean; discovered_figures?: number } | null;

      if (responseData?.success && (responseData.figures_extracted ?? 0) > 0) {
        console.log(`[useFigureExtraction] Success! ${responseData.figures_extracted} figures extracted, ${responseData.discovered_figures ?? 0} discovered`);
        onSuccessRef.current?.();
        return;
      }

      // If unavailable (API limits), don't retry from client either
      if (responseData?.unavailable) {
        console.warn('[useFigureExtraction] Extraction unavailable due to API limits');
        return;
      }

      const isRetryable = responseData?.retryable === true || !!fnErr;
      if (!isRetryable || attempt === MAX_CLIENT_RETRIES) {
        console.warn(`[useFigureExtraction] Giving up after ${attempt} attempts`);
        return;
      }

      const delay = RETRY_BASE_DELAY * Math.pow(2, attempt - 1) + Math.random() * 2000;
      console.log(`[useFigureExtraction] Retrying in ${Math.round(delay / 1000)}s...`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }, [paperId, figures, storagePath, renderPage]);

  useEffect(() => {
    if (triggeredRef.current || !paperId) return;

    // Trigger if: no figures at all (GPT-4o missed them) OR figures exist but lack bounding boxes
    const noFigures = !figures || figures.length === 0;
    const needsExtraction = noFigures || figures.some((f) => !f.image_url && !f.bounding_box);
    if (!needsExtraction) return;

    triggeredRef.current = true;
    void runExtraction()
      .catch((err) => {
        console.warn('[useFigureExtraction] Unexpected extraction failure:', err);
      })
      .finally(() => {
        triggeredRef.current = false;
      });
  }, [paperId, figures, runExtraction]);
}
