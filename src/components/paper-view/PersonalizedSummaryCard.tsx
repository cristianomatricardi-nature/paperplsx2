import { useEffect, useState, useRef, useCallback } from 'react';
import { fetchSummary, generateAudioHook, pollAudioHookJob } from '@/lib/api';
import { SUB_PERSONA_REGISTRY } from '@/types/modules';
import type { SubPersonaId } from '@/types/modules';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, Volume2, Loader2, Pause, Play } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import PersonaSelector from './PersonaSelector';
import type { PolicyViewPayload } from '@/hooks/usePolicyView';

interface SummaryContent {
  narrative_summary: string;
  disclaimer?: string;
  summary_points?: string[];
}

type AudioState = 'idle' | 'generating' | 'ready' | 'playing';

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
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCacheRef = useRef<Record<string, string>>({}); // subPersonaId -> audio_url

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

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  // Reset audio state when persona changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (audioCacheRef.current[subPersonaId]) {
      setAudioState('ready');
    } else {
      setAudioState('idle');
    }
  }, [subPersonaId]);

  // Auto-trigger audio generation when summary loads
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
        audioCacheRef.current[subPersonaId] = result.audio_url;
        setAudioState('ready');
        return;
      }
      if (result.job_id) {
        const completed = await pollAudioHookJob(result.job_id);
        if (completed.audio_url) {
          audioCacheRef.current[subPersonaId] = completed.audio_url;
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
    const url = audioCacheRef.current[subPersonaId];
    if (!url) return;

    if (audioState === 'playing' && audioRef.current) {
      audioRef.current.pause();
      setAudioState('ready');
      return;
    }

    if (!audioRef.current || audioRef.current.src !== url) {
      audioRef.current = new Audio(url);
      audioRef.current.onended = () => setAudioState('ready');
      audioRef.current.onerror = () => setAudioState('ready');
    }

    audioRef.current.play();
    setAudioState('playing');
  }, [audioState, subPersonaId]);

  const renderWithPageRefs = (text: string) => {
    const parts = text.split(/(\(p\.\s*\d+(?:\s*[-–,]\s*\d+)*\))/g);
    return parts.map((part, i) =>
      /^\(p\./.test(part) ? (
        <span key={i} className="text-primary font-medium cursor-pointer hover:underline">
          {part}
        </span>
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

  const renderAudioButton = () => {
    if (audioState === 'generating') {
      return (
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" disabled>
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </Button>
      );
    }
    if (audioState === 'ready') {
      return (
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={handlePlayPause} title="Play audio summary">
          <Play className="h-4 w-4 text-primary" />
        </Button>
      );
    }
    if (audioState === 'playing') {
      return (
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={handlePlayPause} title="Pause audio">
          <Pause className="h-4 w-4 text-primary" />
        </Button>
      );
    }
    // idle — show muted icon (will auto-trigger)
    return (
      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 opacity-40" disabled title="Audio generating...">
        <Volume2 className="h-4 w-4" />
      </Button>
    );
  };

  return (
    <Card className="relative overflow-hidden border-l-4 border-l-primary shadow-sm rounded-xl">
      {/* Header row */}
      <div className="flex items-center justify-between p-5 pb-3">
        <div className="flex items-center gap-2">
          <h2 className="font-sans text-xl font-semibold text-foreground">
            Personalized Summary
          </h2>
          {renderAudioButton()}
        </div>
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
                            <Badge
                              variant="secondary"
                              className="cursor-pointer font-sans text-xs hover:bg-primary hover:text-primary-foreground transition-colors capitalize"
                            >
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
