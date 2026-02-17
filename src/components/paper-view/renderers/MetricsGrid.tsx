import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowUpDown, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { renderWithPageRefs } from './PageReference';
import { explainMetric } from '@/lib/api';

interface MetricRow {
  metric?: string;
  value?: string;
  comparison?: string;
  page_ref?: number | string;
  [key: string]: unknown;
}

interface MetricsGridProps {
  rows: MetricRow[];
  quantitativeHighlights?: string;
  paperId?: number;
}

interface Passage {
  content: string;
  page_numbers: number[];
  similarity: number;
}

type SortMode = 'default' | 'page';

const POSITIVE_SIGNALS = /improv|gain|increas|reduc|better|higher|enhanced|superior|exceed|outperform|\+\d/i;
const NEGATIVE_SIGNALS = /decreas|worse|lower|inferior|degrad|loss|drop|decline|-\d/i;

function getSentiment(comparison?: string): 'positive' | 'negative' | 'neutral' {
  if (!comparison) return 'neutral';
  if (POSITIVE_SIGNALS.test(comparison)) return 'positive';
  if (NEGATIVE_SIGNALS.test(comparison)) return 'negative';
  return 'neutral';
}

function MetricCard({ row, paperId }: { row: MetricRow; paperId?: number }) {
  const [passages, setPassages] = useState<Passage[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const sentiment = getSentiment(row.comparison);

  const handleOpen = async (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen && !passages && !loading && paperId) {
      setLoading(true);
      try {
        const query = [row.metric, row.value, row.comparison].filter(Boolean).join(' ');
        const data = await explainMetric(paperId, query);
        setPassages(data?.passages ?? []);
      } catch {
        setPassages([]);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpen}>
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Card
                draggable
                onDragStart={(e) => {
                  e.stopPropagation();
                  e.dataTransfer.setData('application/json', JSON.stringify({
                    sourceModule: 'M1',
                    type: 'metric',
                    title: row.metric ?? 'Metric',
                    data: row,
                  }));
                  e.dataTransfer.effectAllowed = 'copy';
                }}
                className={cn(
                  'cursor-grab active:cursor-grabbing p-3 transition-all duration-200 hover:shadow-md hover:border-primary/30',
                  open && 'ring-1 ring-primary/20 shadow-md',
                )}
              >
                <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground truncate mb-1">
                  {row.metric ?? 'Metric'}
                </p>
                <p
                  className={cn(
                    'text-lg font-bold leading-tight mb-1.5',
                    sentiment === 'positive' && 'text-primary',
                    sentiment === 'negative' && 'text-destructive',
                    sentiment === 'neutral' && 'text-foreground',
                  )}
                >
                  {row.value ?? '—'}
                </p>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground truncate flex-1">
                    {row.comparison ?? ''}
                  </p>
                  {row.page_ref != null && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">
                      p.{row.page_ref}
                    </Badge>
                  )}
                </div>
              </Card>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <p className="font-medium">{row.metric}</p>
            {row.comparison && <p className="text-xs mt-1">{row.comparison}</p>}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <PopoverContent side="bottom" align="start" className="w-80 p-0">
        <div className="p-3 border-b border-border">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            <BookOpen className="h-3.5 w-3.5" />
            Source in manuscript
          </div>
        </div>
        <div className="p-3 space-y-3 max-h-64 overflow-y-auto">
          {loading && (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          )}
          {!loading && passages && passages.length === 0 && (
            <p className="text-xs text-muted-foreground italic">No matching passages found.</p>
          )}
          {!loading && passages && passages.map((p, i) => (
            <div key={i} className="space-y-1">
              <p className="text-xs leading-relaxed text-foreground/90 border-l-2 border-primary/30 pl-2">
                {p.content.length > 250 ? p.content.slice(0, 250) + '…' : p.content}
              </p>
              <div className="flex items-center gap-1.5">
                {p.page_numbers?.map((pn) => (
                  <Badge key={pn} variant="secondary" className="text-[10px] px-1.5 py-0">
                    p.{pn}
                  </Badge>
                ))}
                <span className="text-[10px] text-muted-foreground ml-auto">
                  {Math.round(p.similarity * 100)}% match
                </span>
              </div>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function MetricsGrid({ rows, quantitativeHighlights, paperId }: MetricsGridProps) {
  const [sortMode, setSortMode] = useState<SortMode>('default');

  const sorted = useMemo(() => {
    if (sortMode === 'page') {
      return [...rows].sort((a, b) => {
        const pa = Number(a.page_ref) || 999;
        const pb = Number(b.page_ref) || 999;
        return pa - pb;
      });
    }
    return rows;
  }, [rows, sortMode]);

  if (!rows || rows.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs gap-1 text-muted-foreground"
          onClick={() => setSortMode((m) => (m === 'default' ? 'page' : 'default'))}
        >
          <ArrowUpDown className="h-3 w-3" />
          {sortMode === 'default' ? 'Sort by page' : 'Original order'}
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {sorted.map((row, i) => (
          <MetricCard key={i} row={row} paperId={paperId} />
        ))}
      </div>

      {quantitativeHighlights && (
        <div className="rounded-lg border border-border bg-muted/30 p-4 mt-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            Quantitative Highlights
          </p>
          <p className="text-sm text-foreground/90 leading-relaxed">
            {renderWithPageRefs(quantitativeHighlights)}
          </p>
        </div>
      )}
    </div>
  );
}
