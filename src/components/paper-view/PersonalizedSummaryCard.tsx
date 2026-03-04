import { useEffect, useState, useRef, useCallback } from 'react';
import { fetchSummary, generateAudioHook, pollAudioHookJob } from '@/lib/api';
import type { SubPersonaId } from '@/types/modules';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import PersonaSelector from './PersonaSelector';
import AudioPlayerBar from './AudioPlayerBar';
import SectionProgressStrip from './SectionProgressStrip';
import type { AudioSection } from './SectionProgressStrip';
import type { PolicyViewPayload } from '@/hooks/usePolicyView';

interface SummaryContent {
  narrative_summary: string;
  disclaimer?: string;
  summary_points?: string[];
}

type AudioState = 'idle' | 'generating' | 'ready' | 'playing';

interface AudioCacheEntry {
  url: string;
  sections?: AudioSection[];
  timestamps?: any;
}

interface PersonalizedSummaryCardProps {
  paperId: number;
  subPersonaId: SubPersonaId;
  onPersonaChange: (id: SubPersonaId) => void;
  allowedPersonas?: SubPersonaId[];
  policyTags?: PolicyViewPayload['policy_tags'] | null;
}

const PersonalizedSummaryCard = ({ paperId, subPersonaId, onPersonaChange, allowedPersonas, policyTags }: PersonalizedSummaryCardProps) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [content, setContent] = useState<SummaryContent | null>(null);
  const [openTag, setOpenTag] = useState<string | null>(null);
  const cacheRef = useRef<Record<string, SummaryContent>>({});

  // Audio state
  const [audioState, setAudioState] = useState<AudioState>('idle');
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [sections, setSections] = useState<AudioSection[]>([]);
  const [timestamps, setTimestamps] = useState<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCacheRef = useRef<Record<string, AudioCacheEntry>>({});
  const rafRef = useRef<number>(0);

  // ── Summary loading ──
  const loadSummary = useCallback(async () => {
    if (cacheRef.current[subPersonaId]) {
      setContent(cacheRef.current[subPersonaId]);
      setError(false);
      return;
    }
    setLoading(true);
    setError(false);
    try {
      const data = await fetchSummary(paperId, subPersonaId);
      const summaryContent = (data?.content ?? data) as SummaryContent;
      cacheRef.current[subPersonaId] = summaryContent;
      setContent(summaryContent);
    } catch {
      setError(true);
      setContent(null);
    } finally {
      setLoading(false);
    }
  }, [paperId, subPersonaId]);

  useEffect(() => { loadSummary(); }, [loadSummary]);

  // ── Audio time tracking via RAF ──
  const startTimeTracking = useCallback(() => {
    const tick = () => {
      if (audioRef.current) {
        setCurrentTime(audioRef.current.currentTime);
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const stopTimeTracking = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  }, []);

  // Reset audio on persona change
  useEffect(() => {
    stopTimeTracking();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setCurrentTime(0);
    setDuration(0);
    const cached = audioCacheRef.current[subPersonaId];
    if (cached) {
      setAudioState('ready');
      setSections(cached.sections || []);
      setTimestamps(cached.timestamps || null);
    } else {
      setAudioState('idle');
      setSections([]);
      setTimestamps(null);
    }
  }, [subPersonaId, stopTimeTracking]);

  // Auto-trigger audio generation
  useEffect(() => {
    if (content && !audioCacheRef.current[subPersonaId] && audioState === 'idle') {
      triggerAudioGeneration();
    }
  }, [content, subPersonaId]);

  const triggerAudioGeneration = useCallback(async () => {
    if (audioCacheRef.current[subPersonaId]) {
      setAudioState('ready');
      return;
    }
    setAudioState('generating');
    try {
      const result = await generateAudioHook(paperId, subPersonaId);
      if (result.status === 'complete' && result.audio_url) {
        const entry: AudioCacheEntry = { url: result.audio_url, sections: result.sections, timestamps: result.timestamps };
        audioCacheRef.current[subPersonaId] = entry;
        setSections(entry.sections || []);
        setTimestamps(entry.timestamps || null);
        setAudioState('ready');
        return;
      }
      if (result.job_id) {
        const completed = await pollAudioHookJob(result.job_id);
        if (completed.audio_url) {
          const entry: AudioCacheEntry = { url: completed.audio_url, sections: completed.sections, timestamps: completed.timestamps };
          audioCacheRef.current[subPersonaId] = entry;
          setSections(entry.sections || []);
          setTimestamps(entry.timestamps || null);
          setAudioState('ready');
        } else {
          setAudioState('idle');
        }
      }
    } catch (err) {
      console.error('[AudioHook] Generation failed:', err);
      setAudioState('idle');
    }
  }, [paperId, subPersonaId]);

  const handlePlayPause = useCallback(() => {
    const cached = audioCacheRef.current[subPersonaId];
    if (!cached?.url) return;

    if (audioState === 'playing' && audioRef.current) {
      audioRef.current.pause();
      stopTimeTracking();
      setAudioState('ready');
      return;
    }

    if (!audioRef.current || audioRef.current.src !== cached.url) {
      audioRef.current = new Audio(cached.url);
      audioRef.current.onended = () => {
        stopTimeTracking();
        setAudioState('ready');
      };
      audioRef.current.onerror = () => {
        stopTimeTracking();
        setAudioState('ready');
      };
      audioRef.current.onloadedmetadata = () => {
        if (audioRef.current) setDuration(audioRef.current.duration);
      };
    }

    audioRef.current.play();
    startTimeTracking();
    setAudioState('playing');
  }, [audioState, subPersonaId, startTimeTracking, stopTimeTracking]);

  const handleSeek = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  }, []);

  // ── Render helpers ──
  const renderWithPageRefs = (text: string) => {
    const parts = text.split(/(\(p\.\s*\d+(?:\s*[-–,]\s*\d+)*\))/g);
    return parts.map((part, i) =>
      /^\(p\./.test(part) ? (
        <span key={i} className="text-primary font-medium cursor-pointer hover:underline">{part}</span>
      ) : (
        <span key={i}>{part}</span>
      ),
    );
  };

  const getNarrative = (c: SummaryContent): string => {
    if (c.narrative_summary) return c.narrative_summary;
    if (c.summary_points) return c.summary_points.join(' ');
    return '';
  };

  const getContextForArea = (area: string) =>
    policyTags?.suggested_policy_contexts.find(
      (ctx) => ctx.context.toLowerCase().includes(area.toLowerCase()) ||
               area.toLowerCase().includes(ctx.context.toLowerCase().split(' ')[0])
    );

  const showPlayer = audioState === 'ready' || audioState === 'playing';
  const showGenerating = audioState === 'generating';

  return (
    <Card className="relative overflow-hidden border-l-4 border-l-primary shadow-sm rounded-xl">
      {/* Header row */}
      <div className="flex items-center justify-between p-5 pb-3">
        <h2 className="font-sans text-xl font-semibold text-foreground">
          Personalized Summary
        </h2>
        <PersonaSelector value={subPersonaId} onChange={onPersonaChange} allowedPersonas={allowedPersonas} />
      </div>

      <div className="px-5 pb-5">
        {loading && (
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
            <Skeleton className="h-4 w-full" />
          </div>
        )}

        {!loading && error && (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <p>Summary generation in progress. Please try again in a moment.</p>
          </div>
        )}

        {!loading && content && (
          <>
            <p className="text-base text-foreground/90 leading-relaxed">
              {renderWithPageRefs(getNarrative(content))}
            </p>

            {/* Audio Player */}
            {showGenerating && (
              <div className="mt-4 space-y-1.5">
                <Skeleton className="h-10 w-full rounded-lg" />
                <Skeleton className="h-4 w-full rounded" />
              </div>
            )}

            {showPlayer && (
              <div className="mt-4">
                <AudioPlayerBar
                  audioState={audioState}
                  currentTime={currentTime}
                  duration={duration}
                  timestamps={timestamps}
                  onPlayPause={handlePlayPause}
                  onSeek={handleSeek}
                />
                {sections.length > 0 && (
                  <SectionProgressStrip
                    sections={sections}
                    currentTime={currentTime}
                    onSeek={handleSeek}
                  />
                )}
              </div>
            )}

            {/* Policy tags badges */}
            {policyTags && policyTags.policy_areas.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap mt-4 pt-3 border-t border-border/40">
                <span className="text-xs text-muted-foreground font-sans font-medium whitespace-nowrap">
                  Policy areas:
                </span>
                {policyTags.policy_areas.map((area) => {
                  const context = getContextForArea(area);
                  if (context) {
                    return (
                      <Popover key={area} open={openTag === area} onOpenChange={(o) => setOpenTag(o ? area : null)}>
                        <PopoverTrigger asChild>
                          <button>
                            <Badge variant="secondary" className="cursor-pointer font-sans text-xs hover:bg-primary hover:text-primary-foreground transition-colors capitalize">
                              {area}
                            </Badge>
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-72 p-3" align="start">
                          <p className="text-xs font-semibold font-sans text-foreground mb-1">{context.context}</p>
                          <p className="text-xs text-muted-foreground font-sans leading-relaxed">{context.relevance}</p>
                        </PopoverContent>
                      </Popover>
                    );
                  }
                  return (
                    <Badge key={area} variant="secondary" className="font-sans text-xs capitalize">
                      {area}
                    </Badge>
                  );
                })}
              </div>
            )}

            <p className="mt-3 text-xs italic text-muted-foreground">
              {content.disclaimer || "⚠️ This summary was generated by AI and may contain inaccuracies. Always refer to the original paper for definitive information."}
            </p>
          </>
        )}
      </div>
    </Card>
  );
};

export default PersonalizedSummaryCard;
