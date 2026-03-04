import { useCallback, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause } from 'lucide-react';

interface AudioPlayerBarProps {
  audioState: 'idle' | 'generating' | 'ready' | 'playing';
  currentTime: number;
  duration: number;
  timestamps?: {
    character_start_times_seconds?: number[];
    character_end_times_seconds?: number[];
  } | null;
  onPlayPause: () => void;
  onSeek: (time: number) => void;
}

const BAR_COUNT = 44;

const AudioPlayerBar = ({
  audioState,
  currentTime,
  duration,
  timestamps,
  onPlayPause,
  onSeek,
}: AudioPlayerBarProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Build energy profile from timestamps (character density per time window)
  const barHeights = useMemo(() => {
    if (!timestamps?.character_start_times_seconds || duration <= 0) {
      // Fallback: pseudo-random waveform pattern
      return Array.from({ length: BAR_COUNT }, (_, i) => {
        const seed = Math.sin(i * 12.9898 + i * 78.233) * 43758.5453;
        return 0.2 + (seed - Math.floor(seed)) * 0.8;
      });
    }

    const starts = timestamps.character_start_times_seconds;
    const windowSize = duration / BAR_COUNT;
    const heights: number[] = [];
    let maxDensity = 1;

    for (let i = 0; i < BAR_COUNT; i++) {
      const wStart = i * windowSize;
      const wEnd = (i + 1) * windowSize;
      let count = 0;
      for (const t of starts) {
        if (t >= wStart && t < wEnd) count++;
      }
      heights.push(count);
      if (count > maxDensity) maxDensity = count;
    }

    // Normalize to 0.15–1.0
    return heights.map(h => 0.15 + (h / maxDensity) * 0.85);
  }, [timestamps, duration]);

  const playheadIndex = duration > 0 ? Math.floor((currentTime / duration) * BAR_COUNT) : 0;

  const handleWaveformClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || duration <= 0) return;
    const rect = containerRef.current.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    onSeek(Math.max(0, Math.min(duration, ratio * duration)));
  }, [duration, onSeek]);

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = Math.floor(s % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isActive = audioState === 'ready' || audioState === 'playing';

  return (
    <div className="flex items-center gap-3 rounded-lg bg-muted/50 px-3 py-2.5">
      {/* Play/Pause */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0 rounded-full"
        onClick={onPlayPause}
        disabled={!isActive}
      >
        {audioState === 'playing' ? (
          <Pause className="h-4 w-4 text-primary" />
        ) : (
          <Play className="h-4 w-4 text-primary" />
        )}
      </Button>

      {/* Waveform */}
      <div
        ref={containerRef}
        className="flex-1 flex items-center gap-[2px] h-8 cursor-pointer"
        onClick={handleWaveformClick}
        role="slider"
        aria-label="Audio progress"
        aria-valuenow={Math.round(currentTime)}
        aria-valuemax={Math.round(duration)}
      >
        {barHeights.map((h, i) => {
          const isPast = i < playheadIndex;
          const isCurrent = i === playheadIndex && audioState === 'playing';
          const isFuture = i > playheadIndex;

          return (
            <div
              key={i}
              className={`flex-1 rounded-full transition-all duration-150 ${
                isPast
                  ? 'bg-primary'
                  : isCurrent
                    ? 'bg-primary animate-pulse'
                    : isFuture
                      ? 'bg-muted-foreground/25'
                      : 'bg-muted-foreground/25'
              }`}
              style={{
                height: `${h * 100}%`,
                minHeight: '3px',
                maxHeight: '100%',
              }}
            />
          );
        })}
      </div>

      {/* Time display */}
      <span className="text-xs text-muted-foreground font-mono tabular-nums shrink-0 min-w-[70px] text-right">
        {formatTime(currentTime)} / {formatTime(duration)}
      </span>
    </div>
  );
};

export default AudioPlayerBar;
