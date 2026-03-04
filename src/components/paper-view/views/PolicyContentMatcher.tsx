import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { MapPin, ChevronDown, ChevronUp, AlertCircle, Sparkles } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { matchPolicyContent } from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { PolicyViewPayload } from '@/hooks/usePolicyView';

interface PolicyContentMatcherProps {
  paperId: number;
  subPersonaId: string;
  policyTags: PolicyViewPayload['policy_tags'];
}

interface MatchResult {
  fit_score: number;
  fit_reasoning: string;
  alignment_areas: Array<{ area: string; paper_evidence: string; policy_connection: string }>;
  relevant_sections: string[];
  suggested_citation: string;
  gaps: string[];
  recommendation: string;
}

const FIT_SCORE_COLOR = (score: number) => {
  if (score >= 7) return 'text-emerald-700 dark:text-emerald-400';
  if (score >= 4) return 'text-amber-600 dark:text-amber-400';
  return 'text-destructive';
};

const PolicyContentMatcher = ({ paperId, subPersonaId, policyTags }: PolicyContentMatcherProps) => {
  const [draftText, setDraftText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<MatchResult | null>(null);
  const [showFull, setShowFull] = useState(false);
  const [expandedArea, setExpandedArea] = useState<number | null>(null);
  const [open, setOpen] = useState(false);

  const handleCheck = async () => {
    if (!draftText.trim()) {
      toast.error('Please paste your policy draft text first');
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await matchPolicyContent(paperId, subPersonaId, draftText);
      if (res?.content) {
        setResult(res.content as MatchResult);
      } else {
        throw new Error(res?.error ?? 'No result returned');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to check policy fit';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-border/60">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-start gap-3 p-5 text-left hover:bg-muted/30 transition-colors">
            <MapPin className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-sans font-semibold text-foreground">Policy Context Fit</p>
              <p className="text-xs text-muted-foreground font-sans mt-0.5">
                Which current policy contexts does this paper support? Paste your policy draft to check AI-powered fit.
              </p>
            </div>
            {open ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            )}
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-4 pt-0">
            {/* Suggested policy contexts */}
            {policyTags.suggested_policy_contexts.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground font-sans mb-2">Suggested contexts:</p>
                <div className="grid gap-2">
                  {policyTags.suggested_policy_contexts.map((ctx) => (
                    <div
                      key={ctx.context}
                      className="rounded-md border border-border/50 bg-muted/30 p-3 space-y-1"
                    >
                      <p className="text-xs font-semibold font-sans text-foreground">{ctx.context}</p>
                      <p className="text-xs text-muted-foreground font-sans leading-relaxed">{ctx.relevance}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Draft input */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground font-sans">
                Add your policy draft to check AI fit:
              </label>
              <Textarea
                placeholder="Paste your policy draft, bill excerpt, regulation text, or policy proposal here…"
                value={draftText}
                onChange={(e) => setDraftText(e.target.value)}
                className="min-h-[100px] text-sm font-sans resize-none"
              />
              <Button
                onClick={handleCheck}
                disabled={loading || !draftText.trim()}
                size="sm"
                className="w-full gap-1.5"
              >
                <Sparkles className="h-3.5 w-3.5" />
                {loading ? 'Checking AI Fit…' : 'Check AI Fit'}
              </Button>
            </div>

            {/* Loading state */}
            {loading && (
              <div className="space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2 text-xs text-destructive font-sans">
                <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Result */}
            {result && (
              <div className="space-y-4 pt-1 border-t border-border/40">
                {/* Fit score */}
                <div className="flex items-center gap-3">
                  <div className="flex items-baseline gap-1">
                    <span className={cn('text-2xl font-bold font-sans tabular-nums', FIT_SCORE_COLOR(result.fit_score))}>
                      {result.fit_score}
                    </span>
                    <span className="text-xs text-muted-foreground font-sans">/10 fit</span>
                  </div>
                  <p className="text-xs text-foreground font-sans leading-relaxed flex-1">
                    {result.fit_reasoning}
                  </p>
                </div>

                {/* Recommendation */}
                <div className="rounded-md bg-muted/40 border border-border/40 p-3">
                  <p className="text-xs font-semibold font-sans text-muted-foreground uppercase tracking-wide mb-1">Recommendation</p>
                  <p className="text-sm font-sans text-foreground leading-relaxed">{result.recommendation}</p>
                </div>

                {/* Toggle full results */}
                <button
                  onClick={() => setShowFull((s) => !s)}
                  className="flex items-center gap-1 text-xs text-primary font-sans hover:underline"
                >
                  {showFull ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  {showFull ? 'Hide details' : 'Show full analysis'}
                </button>

                {showFull && (
                  <div className="space-y-4">
                    {/* Alignment areas */}
                    {result.alignment_areas?.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold font-sans text-muted-foreground uppercase tracking-wide mb-2">
                          Alignment Areas
                        </p>
                        <div className="space-y-2">
                          {result.alignment_areas.map((area, i) => (
                            <div key={i} className="rounded-md border border-border/50 overflow-hidden">
                              <button
                                className="w-full flex items-center justify-between p-3 text-left hover:bg-muted/30"
                                onClick={() => setExpandedArea(expandedArea === i ? null : i)}
                              >
                                <span className="text-xs font-semibold font-sans text-foreground">{area.area}</span>
                                {expandedArea === i ? (
                                  <ChevronUp className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                ) : (
                                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                )}
                              </button>
                              {expandedArea === i && (
                                <div className="px-3 pb-3 space-y-1.5 border-t border-border/40">
                                  <p className="text-xs text-foreground/80 font-sans mt-2">
                                    <span className="font-medium">Paper: </span>{area.paper_evidence}
                                  </p>
                                  <p className="text-xs text-foreground/80 font-sans">
                                    <span className="font-medium">Policy: </span>{area.policy_connection}
                                  </p>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Relevant sections */}
                    {result.relevant_sections?.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold font-sans text-muted-foreground uppercase tracking-wide mb-2">
                          Relevant Paper Excerpts
                        </p>
                        <ul className="space-y-1.5">
                          {result.relevant_sections.map((section, i) => (
                            <li key={i} className="text-xs font-sans text-foreground/80 italic border-l-2 border-primary/40 pl-3 py-0.5">
                              "{section}"
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Suggested citation */}
                    {result.suggested_citation && (
                      <div>
                        <p className="text-xs font-semibold font-sans text-muted-foreground uppercase tracking-wide mb-1">
                          Suggested Citation Context
                        </p>
                        <p className="text-xs font-sans text-foreground/80 bg-muted/40 rounded-md p-3 border border-border/40">
                          {result.suggested_citation}
                        </p>
                      </div>
                    )}

                    {/* Gaps */}
                    {result.gaps?.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold font-sans text-muted-foreground uppercase tracking-wide mb-2">
                          Evidence Gaps
                        </p>
                        <ul className="space-y-1">
                          {result.gaps.map((gap, i) => (
                            <li key={i} className="flex gap-2 text-xs font-sans text-muted-foreground">
                              <span className="text-foreground/50 shrink-0">△</span>
                              <span>{gap}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default PolicyContentMatcher;
