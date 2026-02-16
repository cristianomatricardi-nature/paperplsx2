import { useRef, useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import * as pdfjsLib from 'pdfjs-dist';

// Use the bundled worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

type PDFDocumentProxy = Awaited<ReturnType<typeof pdfjsLib.getDocument extends (...args: any) => { promise: Promise<infer T> } ? () => T : never>>;

export function usePaperPdf(storagePath: string | null) {
  const docRef = useRef<PDFDocumentProxy | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadingRef = useRef(false);

  const ensureLoaded = useCallback(async () => {
    if (docRef.current || !storagePath) return docRef.current;
    if (loadingRef.current) return null;

    loadingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const { data, error: dlError } = await supabase.storage
        .from('research-papers')
        .download(storagePath);

      if (dlError || !data) throw new Error(dlError?.message ?? 'Download failed');

      const arrayBuffer = await data.arrayBuffer();
      const doc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      docRef.current = doc;
      return doc;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'PDF load failed';
      setError(msg);
      console.error('usePaperPdf:', msg);
      return null;
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [storagePath]);

  const renderPage = useCallback(
    async (pageNumber: number, scale = 1.5): Promise<HTMLCanvasElement | null> => {
      const doc = await ensureLoaded();
      if (!doc) return null;

      const page = await doc.getPage(pageNumber);
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      const ctx = canvas.getContext('2d')!;
      await page.render({ canvasContext: ctx, viewport }).promise;
      return canvas;
    },
    [ensureLoaded],
  );

  useEffect(() => {
    return () => {
      docRef.current?.destroy();
      docRef.current = null;
    };
  }, [storagePath]);

  return { renderPage, loading, error };
}
