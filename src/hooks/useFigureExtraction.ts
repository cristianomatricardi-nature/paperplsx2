import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { usePaperPdf } from '@/hooks/usePaperPdf';
import type { Figure } from '@/types/structured-paper';

/**
 * Client-side hook that:
 * 1. Detects figures without image_url
 * 2. Renders their PDF pages to PNG via pdf.js
 * 3. Uploads page PNGs to storage
 * 4. Calls run-figure-extraction edge function with page image paths
 */
export function useFigureExtraction(
  paperId: number | null,
  figures: Figure[] | null,
  storagePath: string | null,
) {
  const { renderPage } = usePaperPdf(storagePath);
  const triggeredRef = useRef(false);

  const runExtraction = useCallback(async () => {
    if (!paperId || !figures || !storagePath || figures.length === 0) return;

    // Check if any figures need extraction (no image_url)
    const needsExtraction = figures.filter((f) => !f.image_url);
    if (needsExtraction.length === 0) return;

    // Collect unique page numbers
    const pageNumbers = [...new Set(needsExtraction.map((f) => f.page_number || 1))];

    console.log(
      `[useFigureExtraction] Rendering ${pageNumbers.length} pages for ${needsExtraction.length} figures`,
    );

    const pageImages: { page_number: number; storage_path: string }[] = [];

    // Render each page to PNG and upload
    for (const pageNum of pageNumbers) {
      try {
        const canvas = await renderPage(pageNum, 2);
        if (!canvas) {
          console.warn(`[useFigureExtraction] Failed to render page ${pageNum}`);
          continue;
        }

        // Convert canvas to blob
        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob((b) => resolve(b), 'image/png'),
        );
        if (!blob) {
          console.warn(`[useFigureExtraction] Failed to convert page ${pageNum} to blob`);
          continue;
        }

        const path = `${paperId}/page_${pageNum}.png`;

        // Upload to paper-figures bucket
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
        console.log(`[useFigureExtraction] Uploaded page ${pageNum} PNG`);
      } catch (err) {
        console.warn(`[useFigureExtraction] Error processing page ${pageNum}:`, err);
      }
    }

    if (pageImages.length === 0) {
      console.warn('[useFigureExtraction] No page images uploaded, skipping extraction');
      return;
    }

    // Call the edge function
    console.log(`[useFigureExtraction] Calling run-figure-extraction with ${pageImages.length} page images`);
    const { error: fnErr } = await supabase.functions.invoke('run-figure-extraction', {
      body: { paper_id: paperId, page_images: pageImages },
    });

    if (fnErr) {
      console.error('[useFigureExtraction] Edge function error:', fnErr);
    } else {
      console.log('[useFigureExtraction] Figure extraction triggered successfully');
    }
  }, [paperId, figures, storagePath, renderPage]);

  useEffect(() => {
    if (triggeredRef.current || !paperId || !figures || figures.length === 0) return;

    // Only trigger if some figures lack image_url
    const needsExtraction = figures.some((f) => !f.image_url);
    if (!needsExtraction) return;

    triggeredRef.current = true;
    runExtraction();
  }, [paperId, figures, runExtraction]);
}
