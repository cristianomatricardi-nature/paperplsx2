import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { PolicyViewPayload } from '@/hooks/usePolicyView';

interface EvidenceDashboardStripProps {
  strip: PolicyViewPayload['executive_strip'];
}

const SCORE_COLOR = (score: number) => {
  if (score >= 7) return 'text-emerald-700 dark:text-emerald-400';
  if (score >= 4) return 'text-amber-600 dark:text-amber-400';
  return 'text-destructive';
};

const EvidenceDashboardStrip = ({ strip }: EvidenceDashboardStripProps) => {
  return (
    <div className="rounded-lg border border-border bg-card p-4 mb-4 space-y-3">
      {/* Relevance score with tooltip */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="inline-flex items-baseline gap-1 cursor-default">
              <span className={cn('text-3xl font-bold font-sans tabular-nums', SCORE_COLOR(strip.relevance_score))}>
                {strip.relevance_score}
              </span>
              <span className="text-sm text-muted-foreground font-sans">/10</span>
              <span className="ml-1.5 text-xs text-muted-foreground font-sans">Policy Relevance</span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            <p className="text-xs leading-relaxed">{strip.relevance_reasoning}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Top finding */}
      <p className="text-sm font-sans text-foreground leading-relaxed border-l-2 border-primary pl-3">
        {strip.top_finding}
      </p>
    </div>
  );
};

export default EvidenceDashboardStrip;
