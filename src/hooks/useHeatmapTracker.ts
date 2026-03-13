import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface HeatmapEvent {
  user_id: string;
  page_path: string;
  x_pct: number;
  y_pct: number;
  viewport_w: number;
  viewport_h: number;
  dwell_ms: number;
}

const SAMPLE_INTERVAL = 2000; // check every 2s
const DWELL_THRESHOLD = 500; // must stay 500ms to count
const FLUSH_INTERVAL = 30000; // batch insert every 30s

export function useHeatmapTracker() {
  const { user } = useAuth();
  const location = useLocation();
  const bufferRef = useRef<HeatmapEvent[]>([]);
  const lastPosRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const mouseRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Track mouse position
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('mousemove', handler, { passive: true });
    return () => window.removeEventListener('mousemove', handler);
  }, []);

  // Sample position periodically
  useEffect(() => {
    if (!user?.id) return;

    const interval = setInterval(() => {
      const { x, y } = mouseRef.current;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const xPct = Math.round((x / vw) * 1000) / 10;
      const yPct = Math.round((y / vh) * 1000) / 10;
      const now = Date.now();

      const last = lastPosRef.current;
      if (last) {
        const dist = Math.abs(x - last.x) + Math.abs(y - last.y);
        const elapsed = now - last.time;
        // Only record if mouse was roughly stationary (within 30px)
        if (dist < 30 && elapsed >= DWELL_THRESHOLD) {
          bufferRef.current.push({
            user_id: user.id,
            page_path: location.pathname,
            x_pct: xPct,
            y_pct: yPct,
            viewport_w: vw,
            viewport_h: vh,
            dwell_ms: elapsed,
          });
        }
      }

      lastPosRef.current = { x, y, time: now };
    }, SAMPLE_INTERVAL);

    return () => clearInterval(interval);
  }, [user?.id, location.pathname]);

  // Flush buffer periodically
  useEffect(() => {
    if (!user?.id) return;

    const flush = () => {
      const events = bufferRef.current.splice(0);
      if (events.length === 0) return;
      supabase.from('user_heatmap_events' as any).insert(events).select();
    };

    const interval = setInterval(flush, FLUSH_INTERVAL);
    // Also flush on unmount
    return () => {
      clearInterval(interval);
      flush();
    };
  }, [user?.id]);
}
