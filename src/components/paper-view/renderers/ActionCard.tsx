import { Badge } from '@/components/ui/badge';
import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ActionData {
  action?: string;
  rationale?: string;
  description?: string;
  target_audience?: string;
  urgency?: 'high' | 'medium' | 'low';
  page_numbers?: number[];
  page_refs?: number[];
}

const URGENCY_DOT: Record<string, string> = {
  high: 'bg-destructive',
  medium: 'bg-yellow-500',
  low: 'bg-green-500',
};

export function ActionCard({ action, moduleId }: { action: ActionData; moduleId?: string }) {
  const urgency = action.urgency ?? 'medium';
  const dotColor = URGENCY_DOT[urgency] ?? URGENCY_DOT.medium;
  const pages = action.page_numbers ?? action.page_refs ?? [];

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('application/json', JSON.stringify({
          sourceModule: moduleId ?? 'M5',
          type: 'action',
          title: action.action ?? 'Action',
          data: action,
        }));
        e.dataTransfer.effectAllowed = 'copy';
      }}
      className="rounded-md border border-border bg-card p-4 space-y-2 group/drag cursor-grab active:cursor-grabbing"
    >
      <div className="flex items-center gap-2">
        <GripVertical className="h-3.5 w-3.5 text-muted-foreground/0 group-hover/drag:text-muted-foreground/60 transition-colors shrink-0" />
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
        {pages.map((p) => (
          <span key={p} className="text-xs font-mono text-accent hover:underline cursor-pointer">
            (p.&nbsp;{p})
          </span>
        ))}
      </div>
    </div>
  );
}
