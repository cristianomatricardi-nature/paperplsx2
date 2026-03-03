import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, FlaskConical, GitFork } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { PARENT_PERSONA_MAP } from '@/lib/constants';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ReplicationCart, type ReplicationCartItem } from './ReplicationCart';
import { AnalyticalPipelineCart } from './AnalyticalPipelineCart';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer } from
'recharts';
import type { SubPersonaId } from '@/types/modules';

/* ---------- types ---------- */

interface ImpactScores {
  conceptual_influence?: number;
  methodological_adoption?: number;
  policy_relevance?: number;
  industry_transfer?: number;
  educational_value?: number;
  replication_readiness?: number;
  reasoning?: Record<string, string>;
}

interface PaperSidebarProps {
  paperId: number;
  paper: Record<string, unknown> | null;
  subPersonaId: SubPersonaId;
  isExpanded: boolean;
  onToggle: () => void;
  isOwner?: boolean;
  authorsMode?: boolean;
  onAuthorsModeChange?: (v: boolean) => void;
  authorScores?: Record<string, number> | null;
  onAuthorScoresChange?: (scores: Record<string, number>) => void;
  cartItems?: ReplicationCartItem[];
  onCartUpdate?: (items: ReplicationCartItem[]) => void;
  pipelineCartItems?: ReplicationCartItem[];
  onPipelineCartUpdate?: (items: ReplicationCartItem[]) => void;
}

/* ---------- constants ---------- */



const DIMENSIONS: {key: keyof Omit<ImpactScores, 'reasoning'>;label: string;short: string;}[] = [
{ key: 'conceptual_influence', label: 'Conceptual Influence', short: 'Concept' },
{ key: 'methodological_adoption', label: 'Methodological Adoption', short: 'Method' },
{ key: 'policy_relevance', label: 'Policy Relevance', short: 'Policy' },
{ key: 'industry_transfer', label: 'Industry Transfer', short: 'Industry' },
{ key: 'educational_value', label: 'Educational Value', short: 'Education' },
{ key: 'replication_readiness', label: 'Replication Readiness', short: 'Replication' }];


type SectionKey = 'replication' | 'pipeline' | 'assessment';

/* ---------- animated placeholder hook ---------- */

function useAnimatedPlaceholder(items: string[], interval = 3500) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % items.length), interval);
    return () => clearInterval(id);
  }, [items, interval]);
  return items[index];
}

/* ---------- component ---------- */

const PaperSidebar = ({
  paperId,
  paper,
  subPersonaId,
  isExpanded,
  onToggle,
  isOwner = false,
  authorsMode = false,
  onAuthorsModeChange,
  authorScores = null,
  onAuthorScoresChange,
  cartItems = [],
  onCartUpdate,
  pipelineCartItems = [],
  onPipelineCartUpdate
}: PaperSidebarProps) => {
  const navigate = useNavigate();
  const isResearcher = PARENT_PERSONA_MAP[subPersonaId] === 'Researcher';

  const [openSections, setOpenSections] = useState<Record<SectionKey, boolean>>({
    replication: true,
    pipeline: true,
    assessment: true
  });
  const [savingScores, setSavingScores] = useState(false);

  const toggleSection = useCallback((key: SectionKey) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const handleCollapsedTabClick = useCallback(
    (key: SectionKey) => {
      setOpenSections((prev) => ({ ...prev, [key]: true }));
      onToggle(); // expand
    },
    [onToggle]
  );

  /* impact scores */
  const rawScores = paper?.simulated_impact_scores as ImpactScores | null | undefined;
  const hasScores = rawScores && DIMENSIONS.some((d) => rawScores[d.key] != null);

  const radarData = DIMENSIONS.map((d) => ({
    axis: d.short,
    value: rawScores?.[d.key] as number ?? 0,
    author: authorScores?.[d.key] ?? 0,
    fullMark: 10
  }));

  const handleAuthorScoreChange = useCallback((key: string, value: number) => {
    const updated = { ...(authorScores ?? {}), [key]: value };
    onAuthorScoresChange?.(updated);
  }, [authorScores, onAuthorScoresChange]);

  const saveAuthorScores = useCallback(async () => {
    if (!authorScores) return;
    setSavingScores(true);
    const { error } = await supabase.
    from('papers').
    update({ author_impact_scores: authorScores as any }).
    eq('id', paperId);
    setSavingScores(false);
    if (error) {
      toast.error('Failed to save scores');
    } else {
      toast.success('Author scores saved');
    }
  }, [authorScores, paperId]);

  /* ---------- collapsed state ---------- */
  if (!isExpanded) {
    return (
      <aside className="hidden lg:flex flex-col items-center w-12 bg-muted/30 border-l border-border py-4 gap-6 sticky top-14 h-[calc(100vh-3.5rem)]">
        {isResearcher && (
          <button
            onClick={() => handleCollapsedTabClick('replication')}
            className="flex items-center justify-center">
            <span className="text-[10px] font-sans font-medium text-muted-foreground tracking-widest uppercase [writing-mode:vertical-lr] rotate-180 hover:text-foreground transition-colors cursor-pointer">
              Replication
            </span>
          </button>
        )}

        {isResearcher && (
          <button
            onClick={() => handleCollapsedTabClick('pipeline')}
            className="flex items-center justify-center">
            <span className="text-[10px] font-sans font-medium text-muted-foreground tracking-widest uppercase [writing-mode:vertical-lr] rotate-180 hover:text-foreground transition-colors cursor-pointer">
              Pipeline
            </span>
          </button>
        )}

        <button
          onClick={() => handleCollapsedTabClick('assessment')}
          className="flex items-center justify-center">
          <span className="text-[10px] font-sans font-medium text-muted-foreground tracking-widest uppercase [writing-mode:vertical-lr] rotate-180 hover:text-foreground transition-colors cursor-pointer">
            Assessment
          </span>
        </button>
      </aside>);

  }

  /* ---------- expanded state ---------- */
  return (
    <aside className="col-span-12 lg:col-span-4 bg-muted/30 border-l border-border min-h-full animate-slide-in-right">
      <div className="sticky top-14 space-y-4 p-5">

        {isResearcher && (
        <div className="rounded-xl border border-border bg-card shadow-md overflow-hidden">
          <Collapsible open={openSections.replication} onOpenChange={() => toggleSection('replication')}>
            <CollapsibleTrigger className="flex w-full items-center justify-center gap-2 px-4 py-3.5 text-sm font-sans font-semibold text-foreground hover:bg-muted/40 transition-colors">
              <div className="text-center">
                <span>Replication Assistant</span>
                <p className="text-[10px] font-normal text-muted-foreground mt-0.5">Gap analysis & reproducibility</p>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="px-4 pb-4 space-y-3">
              <p className="text-xs font-sans text-muted-foreground">
                Compare this paper's methods against your lab inventory and identify gaps for replication.
              </p>
              {onCartUpdate &&
              <ReplicationCart
                paperId={paperId}
                items={cartItems}
                onUpdateItems={onCartUpdate} />

              }
              <Button
                className="w-full gap-2 text-xs"
                size="sm"
                onClick={() => {
                  if (cartItems.length > 0) {
                    sessionStorage.setItem(`replication-cart-${paperId}`, JSON.stringify(cartItems));
                  }
                  navigate(`/replication/${paperId}`);
                }}>

                <FlaskConical className="h-3.5 w-3.5" />
                Open Replication Assistant
              </Button>
            </CollapsibleContent>
          </Collapsible>
        </div>
        )}

        {isResearcher && (
        <div className="rounded-xl border border-border bg-card shadow-md overflow-hidden">
          <Collapsible open={openSections.pipeline} onOpenChange={() => toggleSection('pipeline')}>
            <CollapsibleTrigger className="flex w-full items-center justify-center gap-2 px-4 py-3.5 text-sm font-sans font-semibold text-foreground hover:bg-muted/40 transition-colors">
              <div className="text-center">
                <span>Analytical Pipeline</span>
                <p className="text-[10px] font-normal text-muted-foreground mt-0.5">Fork & compare decisions</p>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="px-4 pb-4 space-y-3">
              <p className="text-xs font-sans text-muted-foreground">Drop a claim, method or figure to compare with your data

              </p>
              {onPipelineCartUpdate &&
              <AnalyticalPipelineCart
                paperId={paperId}
                items={pipelineCartItems}
                onUpdateItems={onPipelineCartUpdate} />

              }
              <Button
                className="w-full gap-2 text-xs"
                size="sm"
                onClick={() => {
                  if (pipelineCartItems.length > 0) {
                    sessionStorage.setItem(`analysis-cart-${paperId}`, JSON.stringify(pipelineCartItems));
                  }
                  navigate(`/analysis/${paperId}`);
                }}>

                <GitFork className="h-3.5 w-3.5" />
                Open Analytical Pipeline
              </Button>
            </CollapsibleContent>
          </Collapsible>
        </div>
        )}

        {/* ── 3. Multidimensional Assessment card ── */}
        <div className="rounded-xl border border-border bg-card shadow-md overflow-hidden">
          <Collapsible open={openSections.assessment} onOpenChange={() => toggleSection('assessment')}>
            <CollapsibleTrigger className="flex w-full items-center justify-center gap-2 px-4 py-3.5 text-sm font-sans font-semibold text-foreground hover:bg-muted/40 transition-colors">
              <div className="text-center">
                <span>Multidimensional Assessment</span>
                <p className="text-[10px] font-normal text-muted-foreground mt-0.5">Projected impact analysis</p>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="px-4 pb-4 space-y-4">
              {hasScores ?
              <>
                  {/* Radar chart */}
                  <div className="w-full aspect-square max-h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={radarData} outerRadius="70%">
                        <PolarGrid stroke="hsl(var(--border))" />
                        <PolarAngleAxis
                        dataKey="axis"
                        tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />

                        <PolarRadiusAxis domain={[0, 10]} tick={false} axisLine={false} />
                        <Radar
                        name="AI Projected"
                        dataKey="value"
                        stroke="#3B82F6"
                        fill="#3B82F6"
                        fillOpacity={0.3} />

                        {authorsMode && authorScores && Object.keys(authorScores).length > 0 &&
                      <Radar
                        name="Author"
                        dataKey="author"
                        stroke="#22C55E"
                        fill="#22C55E"
                        fillOpacity={0.2} />

                      }
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Legend when both polygons visible */}
                  {authorsMode && authorScores && Object.keys(authorScores).length > 0 &&
                <div className="flex items-center justify-center gap-4 text-xs font-sans">
                      <span className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-[#3B82F6]" /> AI Projected
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-[#22C55E]" /> Author
                      </span>
                    </div>
                }

                  {/* Scores breakdown */}
                  <h4 className="font-sans text-sm font-semibold text-foreground">
                    Projected Impact Analysis
                  </h4>
                  <div className="space-y-2">
                    {DIMENSIONS.map((d) => {
                    const score = rawScores?.[d.key] as number ?? 0;
                    const reason = rawScores?.reasoning?.[d.key];
                    const bar =
                    <div key={d.key} className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-sans text-muted-foreground">{d.label}</span>
                            <span className="text-xs font-mono font-semibold text-foreground">{score}/10</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                          className="h-full rounded-full"
                          style={{
                            width: `${score / 10 * 100}%`,
                            backgroundColor: '#3B82F6'
                          }} />

                          </div>
                        </div>;


                    if (reason) {
                      return (
                        <TooltipProvider key={d.key}>
                            <Tooltip>
                              <TooltipTrigger asChild>{bar}</TooltipTrigger>
                              <TooltipContent side="left" className="max-w-xs text-xs">
                                {reason}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>);

                    }
                    return bar;
                  })}
                  </div>

                  <p className="text-[10px] font-sans text-muted-foreground italic leading-relaxed">
                    These scores are AI-projected estimates based on the paper's content
                  </p>

                  {/* Author Self-Assessment section */}
                  {authorsMode &&
                <div className="border-t border-border pt-4 space-y-3">
                      <h4 className="font-sans text-sm font-semibold text-foreground">
                        Author's Self-Assessment
                      </h4>
                      <div className="space-y-3">
                        {DIMENSIONS.map((d) => {
                      const val = authorScores?.[d.key] ?? 5;
                      return (
                        <div key={d.key} className="space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-sans text-muted-foreground">{d.label}</span>
                                <span className="text-xs font-mono font-semibold text-[#22C55E]">{val}/10</span>
                              </div>
                              <Slider
                            value={[val]}
                            min={1}
                            max={10}
                            step={1}
                            onValueChange={([v]) => handleAuthorScoreChange(d.key, v)}
                            className="w-full" />

                            </div>);

                    })}
                      </div>
                      <Button
                    size="sm"
                    className="w-full text-xs"
                    onClick={saveAuthorScores}
                    disabled={savingScores}>

                        {savingScores ? 'Saving...' : 'Save Self-Assessment'}
                      </Button>
                    </div>
                }
                </> :

              <p className="text-xs font-sans text-muted-foreground italic">
                  Impact scores will appear once the analysis pipeline completes.
                </p>
              }
            </CollapsibleContent>
          </Collapsible>
        </div>
      </div>
    </aside>);

};

export default PaperSidebar;