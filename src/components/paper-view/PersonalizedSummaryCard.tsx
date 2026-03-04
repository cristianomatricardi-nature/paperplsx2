import { useEffect, useState, useRef, useCallback } from 'react';
import { fetchSummary } from '@/lib/api';
import { SUB_PERSONA_REGISTRY } from '@/types/modules';
import type { SubPersonaId } from '@/types/modules';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import PersonaSelector from './PersonaSelector';
import type { PolicyViewPayload } from '@/hooks/usePolicyView';

interface SummaryContent {
  narrative_summary: string;
  disclaimer?: string;
  summary_points?: string[];
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

                {policyTags.suggested_policy_contexts.map((ctx) => (
                  <Popover
                    key={ctx.context}
                    open={openTag === ctx.context}
                    onOpenChange={(o) => setOpenTag(o ? ctx.context : null)}
                  >
                    <PopoverTrigger asChild>
                      <button>
                        <Badge
                          variant="outline"
                          className="cursor-pointer font-sans text-xs border-primary/40 text-primary hover:bg-primary/10 transition-colors"
                        >
                          {ctx.context} →
                        </Badge>
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-3" align="start">
                      <p className="text-xs font-semibold font-sans text-foreground mb-1">{ctx.context}</p>
                      <p className="text-xs text-muted-foreground font-sans leading-relaxed">{ctx.relevance}</p>
                    </PopoverContent>
                  </Popover>
                ))}
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
