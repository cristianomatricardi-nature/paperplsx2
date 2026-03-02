import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';
import type { FunderKeyFinding } from '@/hooks/useFunderView';

interface KeyFindingCardProps {
  finding: FunderKeyFinding;
  onEvidenceClick: (refId: string) => void;
}

const confidenceConfig: Record<string, { label: string; className: string }> = {
  high: { label: 'High', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  medium: { label: 'Medium', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  low: { label: 'Low', className: 'bg-red-50 text-red-700 border-red-200' },
};

const KeyFindingCard = ({ finding, onEvidenceClick }: KeyFindingCardProps) => {
  const confidence = confidenceConfig[finding.confidence] ?? confidenceConfig.low;
  const hasEvidence = finding.evidence_refs && finding.evidence_refs.length > 0;

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-sans font-medium text-foreground flex-1">{finding.finding}</p>
        <Badge className={`text-[10px] border shrink-0 ${confidence.className}`}>{confidence.label}</Badge>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {finding.effect_size_text && <span>Effect: {finding.effect_size_text}</span>}
        {finding.uncertainty_text && <span>Uncertainty: {finding.uncertainty_text}</span>}
        {finding.population_or_model && <span>Model: {finding.population_or_model}</span>}
      </div>

      <div className="flex items-center gap-2 flex-wrap pt-1">
        {hasEvidence ? (
          finding.evidence_refs.map((refId) => (
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
      </div>
    </div>
  );
};

export default KeyFindingCard;
