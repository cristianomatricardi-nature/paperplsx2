import { useEffect, useRef, useState } from 'react';
import type { Figure } from '@/types/structured-paper';
import { Skeleton } from '@/components/ui/skeleton';

interface FigureRendererProps {
  figure: Figure;
  paperId: number;
  scale?: number;
  className?: string;
}

/**
 * Renders a figure by loading the page PNG from the public paper-figures bucket
 * and cropping the bounding_box region via canvas. No pdf.js dependency.
 */
export function FigureRenderer({ figure, paperId, scale = 2, className }: FigureRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const bb = figure.bounding_box;
  const pageImageId = bb?.page_image_id ?? `page_${figure.page_number || 1}`;
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const pngUrl = `${supabaseUrl}/storage/v1/object/public/paper-figures/${paperId}/${pageImageId}.png`;

  useEffect(() => {
    if (!bb) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      if (cancelled || !canvasRef.current) return;

      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d')!;

      // Bounding box is normalized (0-1), convert to pixel coords
      const sx = bb.x * img.naturalWidth;
      const sy = bb.y * img.naturalHeight;
      const sw = bb.width * img.naturalWidth;
      const sh = bb.height * img.naturalHeight;

      canvas.width = sw;
      canvas.height = sh;
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);

      setLoading(false);
    };

    img.onerror = () => {
      if (cancelled) return;
      setError('Failed to load page image');
      setLoading(false);
    };

    img.src = pngUrl;

    return () => { cancelled = true; };
  }, [bb, pngUrl]);

  return (
    <div className={className}>
      {loading && (
        <Skeleton className="w-full aspect-[4/3] rounded-md" />
      )}

      <canvas
        ref={canvasRef}
        className={`w-full h-auto rounded-md ${loading ? 'hidden' : ''}`}
      />

      {error && (
        <p className="text-sm text-destructive mt-2">{error}</p>
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
