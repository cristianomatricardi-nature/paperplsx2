import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ActionData {
  action?: string;
  rationale?: string;
  description?: string;
  target_audience?: string;
  urgency?: 'high' | 'medium' | 'low';
  page_numbers?: number[];
}

const URGENCY_DOT: Record<string, string> = {
  high: 'bg-destructive',
  medium: 'bg-yellow-500',
  low: 'bg-green-500',
};

export function ActionCard({ action }: { action: ActionData }) {
  const urgency = action.urgency ?? 'medium';
  const dotColor = URGENCY_DOT[urgency] ?? URGENCY_DOT.medium;

  return (
    <div className="rounded-md border border-border bg-card p-4 space-y-2">
      <div className="flex items-center gap-2">
        <span className={cn('w-2.5 h-2.5 rounded-full flex-shrink-0', dotColor)} />
        <p className="text-sm font-semibold text-foreground">{action.action}</p>
      </div>

      {(action.rationale || action.description) && (
        <p className="text-sm text-muted-foreground leading-relaxed">
          {action.rationale ?? action.description}
        </p>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        {action.target_audience && (
          <Badge variant="secondary" className="text-[10px]">
            {action.target_audience}
          </Badge>
        )}
        {action.page_numbers && action.page_numbers.length > 0 &&
          action.page_numbers.map((p) => (
            <span key={p} className="text-xs font-mono text-accent hover:underline cursor-pointer">
              (p.&nbsp;{p})
            </span>
          ))}
      </div>
    </div>
  );
}
