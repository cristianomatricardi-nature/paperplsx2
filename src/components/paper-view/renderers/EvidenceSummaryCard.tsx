import { Badge } from '@/components/ui/badge';
import { renderWithPageRefs } from './PageReference';

interface EvidenceSummaryData {
  total_claims?: number;
  strong?: number;
  moderate?: number;
  preliminary?: number;
  overall_assessment?: string;
  [key: string]: unknown;
}

interface EvidenceSummaryCardProps {
  data: EvidenceSummaryData;
}

export function EvidenceSummaryCard({ data }: EvidenceSummaryCardProps) {
  const { total_claims, strong = 0, moderate = 0, preliminary = 0, overall_assessment } = data;

  const counts = [
    { label: 'Strong', value: strong, className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' },
    { label: 'Moderate', value: moderate, className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' },
    { label: 'Preliminary', value: preliminary, className: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300' },
  ].filter((c) => c.value > 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center flex-wrap gap-2">
        {total_claims != null && (
          <span className="text-sm font-medium text-foreground">
            {total_claims} claim{total_claims !== 1 ? 's' : ''}:
          </span>
        )}
        {counts.map((c) => (
          <Badge key={c.label} variant="secondary" className={c.className}>
            {c.value} {c.label}
          </Badge>
        ))}
      </div>
      {overall_assessment && (
        <p className="text-base text-foreground/90 leading-relaxed">
          {renderWithPageRefs(overall_assessment)}
        </p>
      )}
    </div>
  );
}
