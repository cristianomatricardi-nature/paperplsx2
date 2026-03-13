import { useState } from 'react';
import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { renderWithPageRefs } from './PageReference';
import type { Figure } from '@/types/structured-paper';
import { FigureRenderer } from '@/components/paper/FigureRenderer';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';

interface ClaimData {
  statement?: string;
  evidence?: string;
  evidence_summary?: string;
  strength?: 'strong' | 'moderate' | 'preliminary' | 'speculative';
  statistics?: (string | { name: string; value: string })[];
  figure_refs?: string[];
  related_figure_ids?: string[];
  method_refs?: string[];
  related_method_ids?: string[];
  page_numbers?: number[];
  page_refs?: number[];
}

const STRENGTH_STYLES: Record<string, { border: string; dot: string }> = {
  strong: { border: 'border-l-green-500', dot: 'bg-green-500' },
  moderate: { border: 'border-l-blue-500', dot: 'bg-blue-500' },
  preliminary: { border: 'border-l-yellow-500', dot: 'bg-yellow-500' },
  speculative: { border: 'border-l-gray-400', dot: 'bg-gray-400' },
};

function InlineFigureThumbnail({ figure, paperId }: { figure: Figure; paperId: number }) {
  const [open, setOpen] = useState(false);
  const hasBb = !!figure.bounding_box;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="w-full rounded border border-border bg-muted/30 overflow-hidden hover:ring-2 hover:ring-primary/40 transition-all cursor-pointer">
          {hasBb ? (
            <FigureRenderer figure={figure} paperId={paperId} className="w-full [&_canvas]:w-full [&_canvas]:h-auto" />
          ) : figure.image_url ? (
            <img src={figure.image_url} alt={figure.caption} className="w-full h-full object-cover" />
          ) : (
            <span className="text-[9px] text-muted-foreground flex items-center justify-center h-full">
              {figure.id}
            </span>
          )}
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        {hasBb ? (
          <FigureRenderer figure={figure} paperId={paperId} scale={3} className="w-full" />
        ) : figure.image_url ? (
          <img src={figure.image_url} alt={figure.caption} className="w-full h-auto rounded-md" />
        ) : (
          <div className="flex items-center justify-center h-48 bg-muted rounded-md text-muted-foreground">
            No image available
          </div>
        )}
        <p className="text-sm font-medium mt-2">{figure.caption}</p>
        {figure.description && <p className="text-xs text-muted-foreground mt-1">{figure.description}</p>}
      </DialogContent>
    </Dialog>
  );
}

export function ClaimCard({ claim, moduleId, figures, paperId }: { claim: ClaimData; moduleId?: string; figures?: Figure[]; paperId?: number }) {
  const strength = claim.strength ?? 'moderate';
  const styles = STRENGTH_STYLES[strength] ?? STRENGTH_STYLES.moderate;
  const evidence = claim.evidence ?? claim.evidence_summary ?? '';
  const pages = claim.page_numbers ?? claim.page_refs ?? [];
  const figRefs = claim.figure_refs ?? claim.related_figure_ids ?? [];
  const methodRefs = claim.method_refs ?? claim.related_method_ids ?? [];

  // Resolve figure refs to actual Figure objects
  const resolvedFigures = figures && paperId
    ? figRefs.map((ref) => figures.find((f) => f.id === ref)).filter(Boolean) as Figure[]
    : [];

  // Build consolidated refs segments (only non-figure refs now if figures are rendered inline)
  const refSegments: string[] = [];
  if (resolvedFigures.length === 0 && figRefs.length > 0) refSegments.push(figRefs.join(', '));
  if (methodRefs.length > 0) refSegments.push(methodRefs.join(', '));
  if (pages.length > 0) refSegments.push(pages.map((p) => `p. ${p}`).join(', '));

  const statsInline = claim.statistics?.map((stat) =>
    typeof stat === 'string' ? stat : `${stat.name}: ${stat.value}`
  ).join('  ·  ');

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('application/json', JSON.stringify({
          sourceModule: moduleId ?? 'M2',
          type: 'claim',
          title: claim.statement ?? 'Claim',
          data: claim,
        }));
        e.dataTransfer.effectAllowed = 'copy';
      }}
      className={cn('rounded-md border border-border bg-card p-3 border-l-4 space-y-1.5 h-full flex flex-col group/drag cursor-grab active:cursor-grabbing', styles.border)}
    >
      {/* Header: dot + strength + statement */}
      <div className="flex items-start gap-2">
        <GripVertical className="h-3.5 w-3.5 text-muted-foreground/0 group-hover/drag:text-muted-foreground/60 transition-colors shrink-0 mt-1" />
        <span className={cn('w-2 h-2 rounded-full mt-1.5 shrink-0', styles.dot)} />
        <div className="min-w-0">
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">{strength}</span>
          <p className="text-sm font-semibold text-foreground leading-snug">{claim.statement}</p>
        </div>
      </div>

      {/* Inline figure thumbnails */}
      {resolvedFigures.length > 0 && paperId && (
        <div className="space-y-2 py-1">
          {resolvedFigures.map((fig) => (
            <InlineFigureThumbnail key={fig.id} figure={fig} paperId={paperId} />
          ))}
        </div>
      )}

      {/* Evidence (clamped) + inline stats */}
      {(evidence || statsInline) && (
        <div className="flex-1 min-w-0">
          {evidence && (
            <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
              {renderWithPageRefs(evidence)}
            </p>
          )}
          {statsInline && (
            <p className="font-mono text-xs text-muted-foreground mt-1">{statsInline}</p>
          )}
        </div>
      )}

      {/* Consolidated refs footer */}
      {refSegments.length > 0 && (
        <div className="text-xs text-muted-foreground pt-1 border-t border-border">
          {refSegments.join('  |  ')}
        </div>
      )}
    </div>
  );
}
