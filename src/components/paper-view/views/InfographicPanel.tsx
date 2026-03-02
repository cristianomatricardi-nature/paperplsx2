import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ImageIcon, Sparkles, AlertCircle } from 'lucide-react';
import { generatePolicyInfographic } from '@/lib/api';
import { toast } from 'sonner';
import type { PolicyViewPayload } from '@/hooks/usePolicyView';

interface InfographicPanelProps {
  paperId: number;
  paperTitle: string | null;
  infographicSpec: PolicyViewPayload['infographic_spec'];
  subPersonaId?: string;
}

const InfographicPanel = ({ paperId, paperTitle, infographicSpec, subPersonaId }: InfographicPanelProps) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setGenerating(true);
    setGenError(null);
    try {
      const result = await generatePolicyInfographic(paperId, paperTitle ?? 'Research Paper', infographicSpec, subPersonaId);
      if (result?.image_url) {
        setImageUrl(result.image_url);
        toast.success('Infographic generated');
      } else {
        throw new Error(result?.error ?? 'No image URL returned');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to generate infographic';
      setGenError(msg);
      toast.error(msg);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Card className="border-border/60 h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <ImageIcon className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm font-sans font-semibold">
            {infographicSpec.title || 'Policy Infographic'}
          </CardTitle>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col gap-3">
        {/* Spec preview — always show */}
        {!imageUrl && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-sans font-medium">Key sections:</p>
            <ul className="space-y-1">
              {infographicSpec.sections.map((s, i) => (
                <li key={i} className="flex gap-2 text-xs font-sans text-foreground/80">
                  <span className="text-primary font-semibold shrink-0">{i + 1}.</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground font-sans mt-2 italic leading-relaxed">
              {infographicSpec.key_visual_description}
            </p>
          </div>
        )}

        {/* Generated image */}
        {imageUrl && (
          <div className="rounded-md overflow-hidden border border-border/40">
            <img
              src={imageUrl}
              alt={`Policy infographic: ${infographicSpec.title}`}
              className="w-full object-cover"
            />
          </div>
        )}

        {/* Loading skeleton */}
        {generating && (
          <div className="space-y-2">
            <Skeleton className="h-40 w-full rounded-md" />
            <p className="text-xs text-muted-foreground font-sans text-center">Generating infographic…</p>
          </div>
        )}

        {/* Error */}
        {genError && (
          <div className="flex items-start gap-2 text-xs text-destructive font-sans">
            <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>{genError}</span>
          </div>
        )}

        {/* Action button */}
        <div className="mt-auto pt-2">
          <Button
            variant={imageUrl ? 'outline' : 'default'}
            size="sm"
            className="w-full gap-1.5"
            onClick={handleGenerate}
            disabled={generating}
          >
            <Sparkles className="h-3.5 w-3.5" />
            {imageUrl ? 'Regenerate Infographic' : 'Generate Infographic'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default InfographicPanel;
