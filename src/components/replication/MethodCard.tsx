import { Badge } from '@/components/ui/badge';
import { Clock, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MethodStep } from '@/types/structured-paper';

interface MethodCardProps {
  method: MethodStep;
  index: number;
  selected: boolean;
  onClick: () => void;
}

export function MethodCard({ method, index, selected, onClick }: MethodCardProps) {
  const toolCount = (method.tools?.length ?? 0) + (method.reagents?.length ?? 0) + (method.software?.length ?? 0);

  return (
    <button
      onClick={onClick}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('application/json', JSON.stringify(method));
        e.dataTransfer.effectAllowed = 'copyMove';
      }}
      className={cn(
        'w-full text-left rounded-lg border p-3 transition-colors',
        selected
          ? 'border-primary bg-primary/5 ring-1 ring-primary'
          : 'border-border hover:bg-muted/50'
      )}
    >
      <div className="flex items-start gap-3">
        <span className={cn(
          'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold',
          selected
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-muted-foreground'
        )}>
          {index + 1}
        </span>
        <div className="min-w-0 flex-1 space-y-1.5">
          <p className="text-sm font-medium leading-tight text-foreground truncate">{method.title}</p>
          <div className="flex flex-wrap gap-1.5">
            {method.duration && (
              <Badge variant="secondary" className="text-[10px] gap-1">
                <Clock className="h-2.5 w-2.5" /> {method.duration}
              </Badge>
            )}
            {toolCount > 0 && (
              <Badge variant="secondary" className="text-[10px] gap-1">
                <Wrench className="h-2.5 w-2.5" /> {toolCount} items
              </Badge>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}
