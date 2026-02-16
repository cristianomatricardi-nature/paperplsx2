import { useEffect, useRef, useState } from 'react';
import type { Figure } from '@/types/structured-paper';
import { usePaperPdf } from '@/hooks/usePaperPdf';
import { Skeleton } from '@/components/ui/skeleton';

interface FigureRendererProps {
  figure: Figure;
  storagePath: string | null;
  scale?: number;
  className?: string;
}

export function FigureRenderer({ figure, storagePath, scale = 2, className }: FigureRendererProps) {
  const { renderPage, loading: pdfLoading, error: pdfError } = usePaperPdf(storagePath);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rendering, setRendering] = useState(false);
  const [rendered, setRendered] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function render() {
      if (!storagePath) return;
      setRendering(true);

      const fullCanvas = await renderPage(figure.page_number || 1, scale);
      if (cancelled || !fullCanvas || !canvasRef.current) {
        setRendering(false);
        return;
      }

      const out = canvasRef.current;
      const ctx = out.getContext('2d')!;
      const bb = figure.bounding_box;

      if (bb) {
        // Crop to bounding box
        const sx = bb.x * fullCanvas.width;
        const sy = bb.y * fullCanvas.height;
        const sw = bb.width * fullCanvas.width;
        const sh = bb.height * fullCanvas.height;

        out.width = sw;
        out.height = sh;
        ctx.drawImage(fullCanvas, sx, sy, sw, sh, 0, 0, sw, sh);
      } else {
        // Show full page
        out.width = fullCanvas.width;
        out.height = fullCanvas.height;
        ctx.drawImage(fullCanvas, 0, 0);
      }

      setRendering(false);
      setRendered(true);
    }

    render();
    return () => { cancelled = true; };
  }, [figure, storagePath, scale, renderPage]);

  const isLoading = pdfLoading || rendering;

  return (
    <div className={className}>
      {isLoading && !rendered && (
        <Skeleton className="w-full aspect-[4/3] rounded-md" />
      )}

      <canvas
        ref={canvasRef}
        className={`w-full h-auto rounded-md ${isLoading && !rendered ? 'hidden' : ''}`}
      />

      {pdfError && (
        <p className="text-sm text-destructive mt-2">Failed to load PDF: {pdfError}</p>
      )}

      <p className="text-sm font-medium text-foreground mt-2">{figure.caption}</p>

      {figure.description && (
        <p className="text-xs text-muted-foreground mt-1">{figure.description}</p>
      )}

      {figure.key_findings?.length > 0 && (
        <ul className="text-xs text-muted-foreground mt-1 list-disc list-inside">
          {figure.key_findings.map((kf, i) => (
            <li key={i}>{kf}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
