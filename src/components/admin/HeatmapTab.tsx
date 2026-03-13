import { useCallback, useEffect, useRef, useState } from 'react';
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

const IFRAME_W = 1440;
const IFRAME_H = 900;

const PAGE_OPTIONS = [
  { value: '/researcher-home', label: 'Researcher Home' },
  { value: '/paper/', label: 'Paper View' },
  { value: '/replication/', label: 'Replication Assistant' },
  { value: '/digital-lab', label: 'Digital Lab' },
];

export default function HeatmapTab() {
  const [events, setEvents] = useState<HeatmapEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageFilter, setPageFilter] = useState('/researcher-home');
  const [samplePath, setSamplePath] = useState('/researcher-home');
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerW, setContainerW] = useState(800);

  // Measure container width for scale calculation
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setContainerW(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const scale = containerW / IFRAME_W;

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('user_heatmap_events' as any)
      .select('page_path, x_pct, y_pct, dwell_ms')
      .like('page_path', `${pageFilter}%`)
      .order('created_at', { ascending: false })
      .limit(5000);

    const rows = (data as any as HeatmapEvent[]) ?? [];
    setEvents(rows);

    // For routes with dynamic IDs (e.g. /paper/123), pick first real path for the iframe
    if (rows.length > 0) {
      setSamplePath(rows[0].page_path);
    } else {
      setSamplePath(pageFilter);
    }

    setLoading(false);
  }, [pageFilter]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Aggregate into grid cells
  const gridSize = 50;
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
              No heatmap data yet for this page. Browse the app to generate mouse dwell data.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            {/* Iframe + heatmap overlay */}
            <div
              ref={containerRef}
              className="relative w-full overflow-hidden"
              style={{ height: IFRAME_H * scale }}
            >
              {/* Live page iframe background */}
              <iframe
                src={samplePath}
                title="Page preview"
                scrolling="no"
                tabIndex={-1}
                className="absolute top-0 left-0 border-0"
                style={{
                  width: IFRAME_W,
                  height: IFRAME_H,
                  transform: `scale(${scale})`,
                  transformOrigin: 'top left',
                  pointerEvents: 'none',
                }}
              />

              {/* Semi-transparent wash to improve dot visibility */}
              <div
                className="absolute inset-0"
                style={{ backgroundColor: 'hsl(var(--background) / 0.45)' }}
              />

              {/* Heatmap radial gradient blobs */}
              {Array.from(grid.entries()).map(([key, cell]) => {
                const [gx, gy] = key.split('-').map(Number);
                const intensity = cell.count / maxCount;
                const cellW = 100 / gridSize;
                const cellH = 100 / gridSize;
                const size = Math.max(12, intensity * 48);

                // Warm color scale: low=yellow, high=red
                const hue = 60 - intensity * 60; // 60 (yellow) → 0 (red)
                const alpha = 0.25 + intensity * 0.55;

                return (
                  <div
                    key={key}
                    className="absolute rounded-full"
                    style={{
                      left: `${gx * cellW + cellW / 2}%`,
                      top: `${gy * cellH + cellH / 2}%`,
                      width: size,
                      height: size,
                      transform: 'translate(-50%, -50%)',
                      background: `radial-gradient(circle, hsla(${hue}, 100%, 50%, ${alpha}) 0%, hsla(${hue}, 100%, 50%, 0) 70%)`,
                    }}
                    title={`${cell.count} events, avg dwell ${Math.round(cell.totalDwell / cell.count)}ms`}
                  />
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center justify-between px-4 py-2 border-t border-border text-xs text-muted-foreground">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full" style={{ background: 'radial-gradient(circle, hsla(60,100%,50%,0.4) 0%, transparent 70%)' }} />
                  Low activity
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 rounded-full" style={{ background: 'radial-gradient(circle, hsla(30,100%,50%,0.6) 0%, transparent 70%)' }} />
                  Medium
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-5 h-5 rounded-full" style={{ background: 'radial-gradient(circle, hsla(0,100%,50%,0.8) 0%, transparent 70%)' }} />
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
