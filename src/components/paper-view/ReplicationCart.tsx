import { useState, useCallback } from 'react';
import { X, Package } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface ReplicationCartItem {
  id: string;
  sourceModule: string;
  type: string;
  title: string;
  data: unknown;
}

interface ReplicationCartProps {
  paperId: number;
  items: ReplicationCartItem[];
  onUpdateItems: (items: ReplicationCartItem[]) => void;
}

const MODULE_COLORS: Record<string, string> = {
  M1: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30',
  M2: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
  M3: 'bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30',
  M4: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30',
  M5: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
  M6: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30',
};

export function ReplicationCart({ paperId, items, onUpdateItems }: ReplicationCartProps) {
  const [dragOver, setDragOver] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    try {
      const raw = e.dataTransfer.getData('application/json');
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!parsed.sourceModule || !parsed.type || !parsed.title) return;
      const id = `${parsed.sourceModule}-${parsed.type}-${Date.now()}`;
      const newItem: ReplicationCartItem = { id, ...parsed };
      const exists = items.some(
        (i) => i.sourceModule === parsed.sourceModule && i.type === parsed.type && i.title === parsed.title
      );
      if (!exists) {
        onUpdateItems([...items, newItem]);
      }
    } catch {
      // ignore
    }
  }, [items, onUpdateItems]);

  const removeItem = useCallback((id: string) => {
    onUpdateItems(items.filter((i) => i.id !== id));
  }, [items, onUpdateItems]);

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        'rounded-lg border-2 border-dashed transition-all duration-200 p-3 space-y-2',
        dragOver
          ? 'border-primary bg-primary/5 shadow-inner'
          : items.length > 0
            ? 'border-border bg-card'
            : 'border-muted-foreground/20 bg-muted/20'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Package className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-semibold text-foreground">
            Replication Cart
          </span>
          {items.length > 0 && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {items.length}
            </Badge>
          )}
        </div>
      </div>

      {/* Cart items */}
      {items.length > 0 ? (
        <div className="space-y-1.5 max-h-48 overflow-y-auto">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-2 rounded-md border border-border bg-background px-2 py-1.5 text-xs group"
            >
              <Badge
                variant="outline"
                className={cn('text-[9px] px-1 py-0 shrink-0 font-mono', MODULE_COLORS[item.sourceModule])}
              >
                {item.sourceModule}
              </Badge>
              <span className="flex-1 truncate text-foreground">{item.title}</span>
              <button
                onClick={() => removeItem(item.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
              >
                <X className="h-3 w-3 text-muted-foreground hover:text-destructive" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[11px] text-muted-foreground text-center py-3">
          {dragOver ? 'Drop here!' : 'Drag module cards here to plan your replication'}
        </p>
      )}

    </div>
  );
}
