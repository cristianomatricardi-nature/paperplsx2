import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { PolicyViewPayload } from '@/hooks/usePolicyView';

interface EvidenceDashboardStripProps {
  strip: PolicyViewPayload['executive_strip'];
}

const CONFIDENCE_CONFIG = {
  high:   { label: 'High Confidence',   value: 90, colorClass: 'text-emerald-700 dark:text-emerald-400' },
  medium: { label: 'Medium Confidence', value: 55, colorClass: 'text-amber-600 dark:text-amber-400' },
  low:    { label: 'Low Confidence',    value: 25, colorClass: 'text-destructive' },
};

const SCORE_COLOR = (score: number) => {
  if (score >= 7) return 'text-emerald-700 dark:text-emerald-400';
  if (score >= 4) return 'text-amber-600 dark:text-amber-400';
  return 'text-destructive';
};

const EvidenceDashboardStrip = ({ strip }: EvidenceDashboardStripProps) => {
  const confidence = CONFIDENCE_CONFIG[strip.confidence_level] ?? CONFIDENCE_CONFIG.medium;

  return (
    <div className="rounded-lg border border-border bg-card p-4 mb-4 space-y-3">
      {/* Top row: relevance score + confidence meter */}
      <div className="flex items-center gap-6 flex-wrap">
        {/* Policy Relevance Score */}
        <div className="flex items-baseline gap-1">
          <span className={cn('text-3xl font-bold font-sans tabular-nums', SCORE_COLOR(strip.relevance_score))}>
            {strip.relevance_score}
          </span>
          <span className="text-sm text-muted-foreground font-sans">/10</span>
          <span className="ml-1.5 text-xs text-muted-foreground font-sans">Policy Relevance</span>
        </div>

        {/* Divider */}
        <div className="hidden sm:block h-8 w-px bg-border" />

        {/* Confidence meter */}
        <div className="flex-1 min-w-[160px]">
          <div className="flex items-center justify-between mb-1">
            <span className={cn('text-xs font-semibold font-sans', confidence.colorClass)}>
              {confidence.label}
            </span>
          </div>
          <Progress value={confidence.value} className="h-1.5" />
        </div>
      </div>

      {/* Top finding */}
      <p className="text-sm font-sans text-foreground leading-relaxed border-l-2 border-primary pl-3">
        {strip.top_finding}
      </p>

      {/* Relevance reasoning */}
      <p className="text-xs text-muted-foreground font-sans leading-relaxed">
        {strip.relevance_reasoning}
      </p>
    </div>
  );
};

export default EvidenceDashboardStrip;
