import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { FunderAim } from '@/hooks/useFunderView';

interface AimAttainmentGridProps {
  aims: FunderAim[];
  onEvidenceClick: (refId: string) => void;
}

const statusConfig: Record<string, { label: string; className: string; borderClass: string }> = {
  met: { label: 'Met', className: 'bg-emerald-100 text-emerald-800 border-emerald-200', borderClass: 'border-l-emerald-500' },
  partial: { label: 'Partial', className: 'bg-amber-100 text-amber-800 border-amber-200', borderClass: 'border-l-amber-500' },
  not_met: { label: 'Not Met', className: 'bg-red-100 text-red-800 border-red-200', borderClass: 'border-l-red-500' },
  inconclusive: { label: 'Inconclusive', className: 'bg-slate-100 text-slate-700 border-slate-200', borderClass: 'border-l-slate-400' },
  not_addressed: { label: 'Not Addressed', className: 'bg-gray-100 text-gray-600 border-gray-200', borderClass: 'border-l-gray-300' },
};

const confidenceConfig: Record<string, { label: string; className: string }> = {
  high: { label: 'High', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  medium: { label: 'Medium', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  low: { label: 'Low', className: 'bg-red-50 text-red-700 border-red-200' },
};

const AimAttainmentGrid = ({ aims, onEvidenceClick }: AimAttainmentGridProps) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!aims || aims.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold uppercase tracking-wide">
          Aim Attainment
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {aims.map((aim) => {
          const status = statusConfig[aim.status] ?? statusConfig.not_addressed;
          const confidence = confidenceConfig[aim.confidence] ?? confidenceConfig.low;
          const hasEvidence = aim.evidence_refs && aim.evidence_refs.length > 0;
          const hasRationale = aim.confidence_rationale && aim.confidence_rationale.length > 0;
          const isExpanded = expandedId === aim.id;

          return (
            <div
              key={aim.id}
              className={`rounded-lg border border-border border-l-4 ${status.borderClass} bg-card p-4 space-y-2`}
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-sans font-medium text-foreground flex-1">{aim.statement}</p>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Badge className={`text-[10px] border ${status.className}`}>{status.label}</Badge>
                  <Badge className={`text-[10px] border ${confidence.className}`}>{confidence.label}</Badge>
                </div>
              </div>

              {aim.outcome_summary && (
                <p className="text-xs text-muted-foreground font-sans">{aim.outcome_summary}</p>
              )}

              {(aim.effect_size_text || aim.uncertainty_text) && (
                <div className="flex gap-3 text-xs text-muted-foreground">
                  {aim.effect_size_text && <span>Effect: {aim.effect_size_text}</span>}
                  {aim.uncertainty_text && <span>Uncertainty: {aim.uncertainty_text}</span>}
                </div>
              )}

              <div className="flex items-center gap-2 flex-wrap">
                {hasEvidence ? (
                  aim.evidence_refs.map((refId) => (
                    <button
                      key={refId}
                      onClick={() => onEvidenceClick(refId)}
                      className="text-[11px] font-mono text-primary underline underline-offset-2 hover:text-primary/80 transition-colors"
                    >
                      {refId}
                    </button>
                  ))
                ) : (
                  <span className="flex items-center gap-1 text-[11px] text-amber-600">
                    <AlertTriangle className="h-3 w-3" />
                    Evidence link missing
                  </span>
                )}

                {hasRationale && (
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : aim.id)}
                    className="ml-auto flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Why?
                    {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                  </button>
                )}
              </div>

              {isExpanded && hasRationale && (
                <ul className="mt-1 pl-4 space-y-1 border-t border-border pt-2">
                  {aim.confidence_rationale.map((r, i) => (
                    <li key={i} className="text-xs text-muted-foreground font-sans list-disc">{r}</li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default AimAttainmentGrid;
