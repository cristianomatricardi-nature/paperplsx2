import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { usePaperPdf } from '@/hooks/usePaperPdf';
import type { Figure } from '@/types/structured-paper';

const MAX_CLIENT_RETRIES = 3;
const RETRY_BASE_DELAY = 5000;

/**
 * Client-side hook that:
 * 1. Detects figures without image_url
 * 2. Renders their PDF pages to PNG via pdf.js
 * 3. Uploads page PNGs to storage
 * 4. Calls run-figure-extraction edge function with page image paths
 * 5. Retries on transient failures; calls onSuccess when images are extracted
 */
export function useFigureExtraction(
  paperId: number | null,
  figures: Figure[] | null,
  storagePath: string | null,
  onSuccess?: () => void,
) {
  const { renderPage } = usePaperPdf(storagePath);
  const triggeredRef = useRef(false);
  const attemptRef = useRef(0);

  const runExtraction = useCallback(async () => {
    if (!paperId || !figures || !storagePath || figures.length === 0) return;

    const needsExtraction = figures.filter((f) => !f.image_url);
    if (needsExtraction.length === 0) return;

    const pageNumbers = [...new Set(needsExtraction.map((f) => f.page_number || 1))];

    console.log(
      `[useFigureExtraction] Rendering ${pageNumbers.length} pages for ${needsExtraction.length} figures`,
    );

    const pageImages: { page_number: number; storage_path: string }[] = [];

    for (const pageNum of pageNumbers) {
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

        const path = `${paperId}/page_${pageNum}.png`;

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
      console.warn('[useFigureExtraction] No page images uploaded, skipping extraction');
      return;
    }

    // Retry loop for the edge function call
    for (let attempt = 1; attempt <= MAX_CLIENT_RETRIES; attempt++) {
      attemptRef.current = attempt;
      console.log(`[useFigureExtraction] Calling edge function (attempt ${attempt}/${MAX_CLIENT_RETRIES})`);

      const { data, error: fnErr } = await supabase.functions.invoke('run-figure-extraction', {
        body: { paper_id: paperId, page_images: pageImages },
      });

      if (fnErr) {
        console.error(`[useFigureExtraction] Edge function error (attempt ${attempt}):`, fnErr);
      }

      // Parse response
      const responseData = data as { success?: boolean; retryable?: boolean; images_uploaded?: number } | null;

      if (responseData?.success && (responseData.images_uploaded ?? 0) > 0) {
        console.log(`[useFigureExtraction] Success! ${responseData.images_uploaded} images extracted`);
        onSuccess?.();
        return;
      }

      // Check if retryable
      const isRetryable = responseData?.retryable === true || fnErr;
      if (!isRetryable || attempt === MAX_CLIENT_RETRIES) {
        console.warn(`[useFigureExtraction] Giving up after ${attempt} attempts. retryable=${responseData?.retryable}`);
        return;
      }

      // Wait before retry with backoff
      const delay = RETRY_BASE_DELAY * Math.pow(2, attempt - 1) + Math.random() * 2000;
      console.log(`[useFigureExtraction] Retrying in ${Math.round(delay / 1000)}s...`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }, [paperId, figures, storagePath, renderPage, onSuccess]);

  useEffect(() => {
    if (triggeredRef.current || !paperId || !figures || figures.length === 0) return;

    const needsExtraction = figures.some((f) => !f.image_url);
    if (!needsExtraction) return;

    triggeredRef.current = true;
    runExtraction();
  }, [paperId, figures, runExtraction]);
}
