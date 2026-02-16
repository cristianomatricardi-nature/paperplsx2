import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ArrowUpDown, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { renderWithPageRefs } from './PageReference';

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

function MetricCard({ row }: { row: MetricRow }) {
  const [open, setOpen] = useState(false);
  const sentiment = getSentiment(row.comparison);

  const extraKeys = Object.keys(row).filter(
    (k) => !['metric', 'value', 'comparison', 'page_ref'].includes(k) && row[k] != null,
  );

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <CollapsibleTrigger asChild>
              <Card
                className={cn(
                  'cursor-pointer p-3 transition-all duration-200 hover:shadow-md hover:border-primary/30',
                  open && 'ring-1 ring-primary/20 shadow-md',
                )}
              >
                {/* Metric name */}
                <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground truncate mb-1">
                  {row.metric ?? 'Metric'}
                </p>

                {/* Value */}
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

                {/* Comparison preview + page ref */}
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

                {/* Expand indicator */}
                <ChevronDown
                  className={cn(
                    'h-3 w-3 text-muted-foreground mx-auto mt-1 transition-transform duration-200',
                    open && 'rotate-180',
                  )}
                />
              </Card>
            </CollapsibleTrigger>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <p className="font-medium">{row.metric}</p>
            {row.comparison && <p className="text-xs mt-1">{row.comparison}</p>}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <CollapsibleContent className="px-3 pb-3 pt-1 text-sm space-y-1">
        {row.comparison && (
          <p className="text-muted-foreground text-xs leading-relaxed">{row.comparison}</p>
        )}
        {extraKeys.map((k) => (
          <div key={k} className="flex justify-between text-xs">
            <span className="text-muted-foreground capitalize">{k.replace(/_/g, ' ')}</span>
            <span className="font-medium">{String(row[k])}</span>
          </div>
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}

export function MetricsGrid({ rows, quantitativeHighlights }: MetricsGridProps) {
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
      {/* Sort toggle */}
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

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {sorted.map((row, i) => (
          <MetricCard key={i} row={row} />
        ))}
      </div>

      {/* Quantitative highlights narrative */}
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
