import { useEffect, useState, useRef, useCallback } from 'react';
import { fetchSummary, generateAudioHook, pollAudioHookJob } from '@/lib/api';
import type { SubPersonaId } from '@/types/modules';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Lightbulb, Target, Beaker, ArrowRight, ChevronLeft, ChevronRight, Info } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import PersonaSelector from './PersonaSelector';
import AudioPlayerBar from './AudioPlayerBar';
import SectionProgressStrip from './SectionProgressStrip';
import { FigureRenderer } from '@/components/paper/FigureRenderer';
import type { AudioSection } from './SectionProgressStrip';
import type { PolicyViewPayload } from '@/hooks/usePolicyView';
import useEmblaCarousel from 'embla-carousel-react';

interface StoryCard {
  slug: string;
  title: string;
  body: string;
  linked_module?: string;
  context_figure_id?: string;
}

interface SummaryContent {
  narrative_summary?: string;
  cards?: StoryCard[];
  disclaimer?: string;
  summary_points?: string[];
  personalized?: boolean;
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
  userId?: string;
  figures?: any[];
  onModuleClick?: (moduleId: string) => void;
}

const SLIDE_ICONS: Record<string, React.ReactNode> = {
  what: <Lightbulb className="h-5 w-5" />,
  why: <Target className="h-5 w-5" />,
  how: <Beaker className="h-5 w-5" />,
  next: <ArrowRight className="h-5 w-5" />
};

const SLIDE_COLORS: Record<string, string> = {
  what: 'bg-primary/10 text-primary',
  why: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  how: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  next: 'bg-violet-500/10 text-violet-600 dark:text-violet-400'
};

const PersonalizedSummaryCard = ({
  paperId,
  subPersonaId,
  onPersonaChange,
  allowedPersonas,
  policyTags,
  userId,
  figures,
  onModuleClick
}: PersonalizedSummaryCardProps) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [content, setContent] = useState<SummaryContent | null>(null);
  const [openTag, setOpenTag] = useState<string | null>(null);
  const cacheRef = useRef<Record<string, SummaryContent>>({});

  // Carousel
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  // Audio state
  const [audioState, setAudioState] = useState<AudioState>('idle');
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [sections, setSections] = useState<AudioSection[]>([]);
  const [timestamps, setTimestamps] = useState<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCacheRef = useRef<Record<string, AudioCacheEntry>>({});
  const rafRef = useRef<number>(0);

  // Embla callbacks
  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
    setCanScrollPrev(emblaApi.canScrollPrev());
    setCanScrollNext(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);
    return () => {
      emblaApi.off('select', onSelect);
      emblaApi.off('reInit', onSelect);
    };
  }, [emblaApi, onSelect]);

  // ── Summary loading ──
  const loadSummary = useCallback(async () => {
    const cacheKey = userId ? `${subPersonaId}__lib_${userId}` : subPersonaId;
    if (cacheRef.current[cacheKey]) {
      setContent(cacheRef.current[cacheKey]);
      setError(false);
      return;
    }
    setLoading(true);
    setError(false);
    try {
      const data = await fetchSummary(paperId, subPersonaId, userId);
      const summaryContent = (data?.content ?? data) as SummaryContent;
      // Carry personalized flag from the response envelope; default to false if missing
      summaryContent.personalized = data?.personalized === true;
      cacheRef.current[cacheKey] = summaryContent;
      setContent(summaryContent);
    } catch {
      setError(true);
      setContent(null);
    } finally {
      setLoading(false);
    }
  }, [paperId, subPersonaId, userId]);

  useEffect(() => {loadSummary();}, [loadSummary]);

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
    /^\(p\./.test(part) ?
    <span key={i} className="text-primary font-medium cursor-pointer hover:underline">{part}</span> :

    <span key={i}>{part}</span>

    );
  };

  // Check if content uses new card format or old narrative format
  const hasCards = content?.cards && Array.isArray(content.cards) && content.cards.length > 0;

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

  // Find context figure for "What" card
  const getContextFigure = (card: StoryCard) => {
    if (!card.context_figure_id || !figures) return null;
    return figures.find((f) => f.id === card.context_figure_id) || null;
  };

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
        {loading &&
        <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
            <Skeleton className="h-4 w-full" />
          </div>
        }

        {!loading && error &&
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <p>Summary generation in progress. Please try again in a moment.</p>
          </div>
        }

        {!loading && content &&
        <>
            {/* New carousel format */}
            {hasCards ?
          <div className="relative">
                {/* Navigation buttons */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex gap-1">
                    {content.cards!.map((card, i) =>
                <button
                  key={card.slug}
                  onClick={() => emblaApi?.scrollTo(i)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                  selectedIndex === i ?
                  'bg-primary text-primary-foreground' :
                  'bg-muted text-muted-foreground hover:bg-muted/80'}`
                  }>
                  
                        {card.title}
                      </button>
                )}
                  </div>
                  <div className="flex gap-1">
                    <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => emblaApi?.scrollPrev()}
                  disabled={!canScrollPrev}>
                  
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => emblaApi?.scrollNext()}
                  disabled={!canScrollNext}>
                  
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Embla carousel */}
                <div className="overflow-hidden" ref={emblaRef}>
                  <div className="flex">
                    {content.cards!.map((card) => {
                  const ctxFigure = getContextFigure(card);
                  return (
                    <div key={card.slug} className="flex-[0_0_100%] min-w-0 px-1">
                          <div className="rounded-lg border border-border/50 bg-card/50 p-4">
                            {/* Card header */}
                            <div className="flex items-center gap-2.5 mb-3">
                              <div className={`flex items-center justify-center h-8 w-8 rounded-lg ${SLIDE_COLORS[card.slug] || 'bg-muted text-muted-foreground'}`}>
                                {SLIDE_ICONS[card.slug]}
                              </div>
                              <h3 className="font-sans text-sm font-semibold text-foreground uppercase tracking-wide">
                                {card.title}
                              </h3>
                            </div>

                            {/* Context figure for "What" card */}
                            {card.slug === 'what' && ctxFigure && ctxFigure.bounding_box &&
                        <div className="mb-3 rounded-md overflow-hidden border border-border/30 bg-muted/20">
                                <FigureRenderer
                            paperId={paperId}
                            figure={ctxFigure}
                            className="w-full max-h-48 object-contain" />
                          
                                <p className="text-[11px] text-muted-foreground px-2 py-1.5 italic truncate">
                                  {ctxFigure.caption}
                                </p>
                              </div>
                        }

                            {/* Info banner for non-personalized "next" card */}
                            {card.slug === 'next' && content.personalized === false &&
                        <div className="flex items-start gap-2 mb-3 p-2.5 rounded-md bg-muted border-dotted border-4 border-accent">
                                <Info className="h-4 shrink-0 mt-0.5 border-destructive-foreground w-[16px] text-destructive-foreground bg-destructive-foreground" />
                                <p className="leading-snug text-black text-sm">
                                  Add papers to your library from the Hub to get personalized next steps based on your own research.
                                </p>
                              </div>
                        }

                            {/* Card body */}
                            <p className="text-sm text-foreground/90 leading-relaxed">
                              {renderWithPageRefs(card.body)}
                            </p>

                            {/* Module link */}
                            {card.linked_module && onModuleClick &&
                        <button
                          onClick={() => onModuleClick(card.linked_module!)}
                          className="mt-3 text-xs font-medium text-primary hover:text-primary/80 flex items-center gap-1 transition-colors">
                          
                                Explore in detail
                                <ArrowRight className="h-3 w-3" />
                              </button>
                        }
                          </div>
                        </div>);

                })}
                  </div>
                </div>

                {/* Dot indicators */}
                <div className="flex justify-center gap-1.5 mt-3">
                  {content.cards!.map((_, i) =>
              <button
                key={i}
                onClick={() => emblaApi?.scrollTo(i)}
                className={`h-1.5 rounded-full transition-all ${
                selectedIndex === i ? 'w-6 bg-primary' : 'w-1.5 bg-muted-foreground/30'}`
                } />

              )}
                </div>
              </div> : (

          /* Old single-paragraph format — backward compat */
          <p className="text-base text-foreground/90 leading-relaxed">
                {renderWithPageRefs(getNarrative(content))}
              </p>)
          }

            {/* Audio Player */}
            {showGenerating &&
          <div className="mt-4 space-y-1.5">
                <Skeleton className="h-10 w-full rounded-lg" />
                <Skeleton className="h-4 w-full rounded" />
              </div>
          }

            {showPlayer &&
          <div className="mt-4">
                <AudioPlayerBar
              audioState={audioState}
              currentTime={currentTime}
              duration={duration}
              timestamps={timestamps}
              onPlayPause={handlePlayPause}
              onSeek={handleSeek} />
            
                {sections.length > 0 &&
            <SectionProgressStrip
              sections={sections}
              currentTime={currentTime}
              onSeek={handleSeek} />

            }
              </div>
          }

            {/* Policy tags badges */}
            {policyTags && policyTags.policy_areas.length > 0 &&
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
                      </Popover>);

              }
              return (
                <Badge key={area} variant="secondary" className="font-sans text-xs capitalize">
                      {area}
                    </Badge>);

            })}
              </div>
          }

            <p className="mt-3 text-xs italic text-muted-foreground">
              {content.disclaimer || "⚠️ This summary was generated by AI and may contain inaccuracies. Always refer to the original paper for definitive information."}
            </p>
          </>
        }
      </div>
    </Card>);

};

export default PersonalizedSummaryCard;