import { useHeatmapTracker } from '@/hooks/useHeatmapTracker';

export function HeatmapProvider() {
  useHeatmapTracker();
  return null;
}
