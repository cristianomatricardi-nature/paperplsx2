import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { FunderAim } from '@/hooks/useFunderView';

interface ConfidenceScorecardProps {
  aims: FunderAim[];
}

const confidenceConfig: Record<string, { label: string; className: string }> = {
  high: { label: 'High', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  medium: { label: 'Medium', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  low: { label: 'Low', className: 'bg-red-50 text-red-700 border-red-200' },
};

const ConfidenceScorecard = ({ aims }: ConfidenceScorecardProps) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!aims || aims.length === 0) return null;

  return (
    <div>
      <h3 className="text-sm font-semibold font-sans text-foreground mb-3 uppercase tracking-wide">
        Confidence & Robustness
      </h3>
      <div className="rounded-lg border border-border bg-card divide-y divide-border">
        {aims.map((aim) => {
          const conf = confidenceConfig[aim.confidence] ?? confidenceConfig.low;
          const isExpanded = expandedId === aim.id;
          const hasRationale = aim.confidence_rationale && aim.confidence_rationale.length > 0;

          return (
            <div key={aim.id} className="px-4 py-3">
              <button
                onClick={() => hasRationale && setExpandedId(isExpanded ? null : aim.id)}
                className="flex items-center justify-between w-full text-left gap-3"
                disabled={!hasRationale}
              >
                <span className="text-sm font-sans text-foreground flex-1 line-clamp-1">
                  {aim.statement}
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge className={`text-[10px] border ${conf.className}`}>{conf.label}</Badge>
                  {hasRationale && (
                    isExpanded
                      ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                      : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                </div>
              </button>
              {isExpanded && hasRationale && (
                <ul className="mt-2 pl-4 space-y-1">
                  {aim.confidence_rationale.map((r, i) => (
                    <li key={i} className="text-xs text-muted-foreground font-sans list-disc">
                      {r}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ConfidenceScorecard;
