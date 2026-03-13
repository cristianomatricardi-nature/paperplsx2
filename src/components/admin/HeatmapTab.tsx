import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, MousePointer2 } from 'lucide-react';

interface HeatmapEvent {
  page_path: string;
  x_pct: number;
  y_pct: number;
  dwell_ms: number;
}

const PAGE_OPTIONS = [
  { value: 'all', label: 'All Pages' },
  { value: '/researcher-home', label: 'Researcher Home' },
  { value: '/paper/', label: 'Paper View' },
  { value: '/replication/', label: 'Replication Assistant' },
  { value: '/analysis/', label: 'Analytical Pipeline' },
  { value: '/digital-lab', label: 'Digital Lab' },
];

export default function HeatmapTab() {
  const [events, setEvents] = useState<HeatmapEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageFilter, setPageFilter] = useState('all');

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('user_heatmap_events' as any)
      .select('page_path, x_pct, y_pct, dwell_ms')
      .order('created_at', { ascending: false })
      .limit(5000);

    if (pageFilter !== 'all') {
      query = query.like('page_path', `${pageFilter}%`);
    }

    const { data } = await query;
    setEvents((data as any as HeatmapEvent[]) ?? []);
    setLoading(false);
  }, [pageFilter]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Aggregate into grid cells
  const gridSize = 50; // 50x50 grid
  const grid = new Map<string, { count: number; totalDwell: number }>();
  for (const e of events) {
    const gx = Math.floor(e.x_pct / (100 / gridSize));
    const gy = Math.floor(e.y_pct / (100 / gridSize));
    const key = `${gx}-${gy}`;
    const cell = grid.get(key) ?? { count: 0, totalDwell: 0 };
    cell.count++;
    cell.totalDwell += e.dwell_ms;
    grid.set(key, cell);
  }

  const maxCount = Math.max(1, ...Array.from(grid.values()).map((c) => c.count));

  // Unique pages
  const uniquePages = new Set(events.map((e) => e.page_path));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Heatmap Analytics
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            {events.length} data points across {uniquePages.size} unique pages
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={pageFilter} onValueChange={setPageFilter}>
            <SelectTrigger className="w-48 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={fetchEvents} disabled={loading}>
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Refresh'}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 gap-2">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Loading heatmap data…</span>
        </div>
      ) : events.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <MousePointer2 className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              No heatmap data yet. Mouse dwell positions will appear here as users interact with the platform.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            {/* Dot-density heatmap visualization */}
            <div
              className="relative w-full bg-muted/20"
              style={{ aspectRatio: '16/9' }}
            >
              {/* Grid overlay */}
              {Array.from(grid.entries()).map(([key, cell]) => {
                const [gx, gy] = key.split('-').map(Number);
                const intensity = cell.count / maxCount;
                const cellW = 100 / gridSize;
                const cellH = 100 / gridSize;
                return (
                  <div
                    key={key}
                    className="absolute rounded-full"
                    style={{
                      left: `${gx * cellW + cellW / 2}%`,
                      top: `${gy * cellH + cellH / 2}%`,
                      width: `${Math.max(4, intensity * 24)}px`,
                      height: `${Math.max(4, intensity * 24)}px`,
                      transform: 'translate(-50%, -50%)',
                      backgroundColor: `hsl(var(--primary) / ${0.15 + intensity * 0.7})`,
                    }}
                    title={`${cell.count} events, avg dwell ${Math.round(cell.totalDwell / cell.count)}ms`}
                  />
                );
              })}

              {/* Axis labels */}
              <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[10px] text-muted-foreground">
                Viewport Width →
              </div>
              <div className="absolute left-1 top-1/2 -translate-y-1/2 -rotate-90 text-[10px] text-muted-foreground">
                Viewport Height →
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center justify-between px-4 py-2 border-t border-border text-xs text-muted-foreground">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'hsl(var(--primary) / 0.2)' }} />
                  Low activity
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'hsl(var(--primary) / 0.5)' }} />
                  Medium
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: 'hsl(var(--primary) / 0.85)' }} />
                  High activity
                </div>
              </div>
              <span>Max: {maxCount} events in one cell</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
