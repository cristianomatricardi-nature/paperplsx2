import { useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, RefreshCw, ImageIcon, FileText, Sparkles, Code, Eye, ShieldX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import PersonalizedSummaryCard from '@/components/paper-view/PersonalizedSummaryCard';
import EvidenceDashboardStrip from './EvidenceDashboardStrip';
import PolicyContentMatcher from './PolicyContentMatcher';
import { usePolicyView } from '@/hooks/usePolicyView';
import { useUserRole } from '@/hooks/useUserRole';
import { generatePolicyInfographic } from '@/lib/api';
import { toast } from 'sonner';
import type { SubPersonaId } from '@/types/modules';
import type { PolicyViewPayload } from '@/hooks/usePolicyView';

interface PolicyMakerViewProps {
  paperId: number;
  subPersonaId: SubPersonaId;
  paper: Record<string, unknown> | null;
  onPersonaChange: (persona: SubPersonaId) => void;
  allowedPersonas?: SubPersonaId[];
}

const EVIDENCE_QUALITY_COLORS: Record<string, string> = {
  Strong:      'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
  Moderate:    'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  Preliminary: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300 border-orange-200 dark:border-orange-800',
};

const PolicyMakerView = ({
  paperId,
  subPersonaId,
  paper,
  onPersonaChange,
  allowedPersonas,
}: PolicyMakerViewProps) => {
  const { payload, loading, error, refetch } = usePolicyView(paperId, subPersonaId);
  const { isAdmin } = useUserRole();

  const paperTitle = (paper?.title as string) ?? null;
  const journal = (paper?.journal as string) ?? null;
  const publicationDate = (paper?.publication_date as string) ?? null;

  // Infographic state
  const [infographicUrl, setInfographicUrl] = useState<string | null>(null);
  const [infographicGenerating, setInfographicGenerating] = useState(false);
  const [infographicError, setInfographicError] = useState<string | null>(null);
  const [infographicNotRelevant, setInfographicNotRelevant] = useState<string | null>(null);
  const [infographicRelevanceScore, setInfographicRelevanceScore] = useState<number | null>(null);
  const [showFullRes, setShowFullRes] = useState(false);
  const [debugData, setDebugData] = useState<any>(null);
  const [showDebug, setShowDebug] = useState(false);

  // Brief dialog state
  const [showBrief, setShowBrief] = useState(false);
  const [briefGenerated, setBriefGenerated] = useState(false);

  const handleGenerateInfographic = async () => {
    if (!payload) return;
    setInfographicGenerating(true);
    setInfographicError(null);
    setInfographicNotRelevant(null);
    setInfographicRelevanceScore(null);
    try {
      const result = await generatePolicyInfographic(paperId, paperTitle ?? 'Research Paper', payload.infographic_spec, subPersonaId);
      if (result?.policy_relevant === false) {
        setInfographicRelevanceScore(result.policy_relevance_score ?? 0);
        setInfographicNotRelevant(result.reason ?? 'This research does not have clear policy implications.');
        if (result.debug) setDebugData(result.debug);
        toast.info(`Policy relevance score: ${result.policy_relevance_score ?? 0}/10 — below threshold`);
        return;
      }
      if (result?.image_url) {
        setInfographicUrl(result.image_url);
        if (result.debug) setDebugData(result.debug);
        toast.success('Infographic generated');
      } else {
        throw new Error(result?.error ?? 'No image URL returned');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to generate infographic';
      setInfographicError(msg);
      toast.error(msg);
    } finally {
      setInfographicGenerating(false);
    }
  };

  const handleGenerateBrief = () => {
    setBriefGenerated(true);
    setShowBrief(true);
  };

  const scoreColor = payload
    ? payload.executive_strip.relevance_score >= 7
      ? 'text-emerald-700 dark:text-emerald-400'
      : payload.executive_strip.relevance_score >= 4
      ? 'text-amber-600 dark:text-amber-400'
      : 'text-destructive'
    : '';

  const qualityColor = payload
    ? EVIDENCE_QUALITY_COLORS[payload.policy_brief.evidence_quality] ?? EVIDENCE_QUALITY_COLORS.Moderate
    : '';

  return (
    <div className="space-y-4">
      {/* 1. Personalized Summary Card (with policy tags) */}
      <PersonalizedSummaryCard
        paperId={paperId}
        subPersonaId={subPersonaId}
        onPersonaChange={onPersonaChange}
        allowedPersonas={allowedPersonas}
        policyTags={payload?.policy_tags ?? null}
      />

      {/* Loading state */}
      {loading && (
        <div className="space-y-4 pt-2">
          <Skeleton className="h-20 w-full rounded-lg" />
          <div className="flex gap-3">
            <Skeleton className="h-24 w-1/2 rounded-lg" />
            <Skeleton className="h-24 w-1/2 rounded-lg" />
          </div>
          <p className="text-xs text-muted-foreground font-sans text-center pt-1">
            Generating policy intelligence brief…
          </p>
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-5 flex flex-col items-center gap-3 text-center">
          <AlertCircle className="h-6 w-6 text-destructive" />
          <p className="text-sm font-sans text-destructive">{error}</p>
          <Button variant="outline" size="sm" onClick={refetch} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </Button>
        </div>
      )}

      {/* Main content */}
      {payload && !loading && (
        <>
          {/* 2. Slim Evidence Dashboard Strip */}
          <EvidenceDashboardStrip strip={payload.executive_strip} />

          {/* 3. Two square action buttons */}
          <div className="grid grid-cols-2 gap-3">
            {/* Generate Infographic button */}
            <div className="flex flex-col gap-2">
              <button
                onClick={handleGenerateInfographic}
                disabled={infographicGenerating}
                className={cn(
                  "flex flex-col items-center justify-center gap-2 rounded-lg border border-border bg-card p-5 transition-all hover:border-primary/50 hover:bg-accent/50",
                  infographicGenerating && "opacity-60 pointer-events-none",
                  infographicUrl && "border-primary/30"
                )}
              >
                {infographicGenerating ? (
                  <Sparkles className="h-6 w-6 text-primary animate-pulse" />
                ) : (
                  <ImageIcon className="h-6 w-6 text-primary" />
                )}
                <span className="text-xs font-sans font-medium text-foreground">
                  {infographicGenerating ? 'Generating…' : infographicUrl ? 'Regenerate Infographic' : 'Generate Infographic'}
                </span>
              </button>

              {/* Infographic result icon */}
              {infographicUrl && (
                <button
                  onClick={() => setShowFullRes(true)}
                  className="flex items-center gap-2 rounded-md border border-border/60 bg-muted/40 px-3 py-2 transition-colors hover:bg-accent/60"
                >
                  <img src={infographicUrl} alt="Infographic thumbnail" className="h-8 w-8 rounded object-cover" />
                  <span className="text-xs font-sans text-muted-foreground">View infographic</span>
                  <Eye className="h-3.5 w-3.5 text-muted-foreground ml-auto" />
                </button>
              )}

              {/* Not relevant message */}
              {infographicNotRelevant && (
                <div className="flex items-start gap-2 rounded-md border border-muted bg-muted/40 px-3 py-2">
                  <ShieldX className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <p className="text-xs font-sans text-muted-foreground leading-relaxed">
                    Score {infographicRelevanceScore}/10 — {infographicNotRelevant}
                  </p>
                </div>
              )}

              {infographicError && (
                <p className="text-xs text-destructive font-sans flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> {infographicError}
                </p>
              )}

              {/* Admin debug link */}
              {isAdmin && debugData && (
                <button
                  onClick={() => setShowDebug(true)}
                  className="text-[11px] text-muted-foreground font-sans hover:text-foreground transition-colors flex items-center gap-1 self-start"
                >
                  <Code className="h-3 w-3" /> Debug pipeline
                </button>
              )}
            </div>

            {/* Generate Policy Brief button */}
            <div className="flex flex-col gap-2">
              <button
                onClick={handleGenerateBrief}
                className="flex flex-col items-center justify-center gap-2 rounded-lg border border-border bg-card p-5 transition-all hover:border-primary/50 hover:bg-accent/50"
              >
                <FileText className="h-6 w-6 text-primary" />
                <span className="text-xs font-sans font-medium text-foreground">
                  {briefGenerated ? 'View Policy Brief' : 'Generate Policy Brief'}
                </span>
              </button>

              {/* Brief result icon */}
              {briefGenerated && (
                <button
                  onClick={() => setShowBrief(true)}
                  className="flex items-center gap-2 rounded-md border border-border/60 bg-muted/40 px-3 py-2 transition-colors hover:bg-accent/60"
                >
                  <FileText className="h-4 w-4 text-primary" />
                  <span className="text-xs font-sans text-muted-foreground">Open policy brief</span>
                  <Eye className="h-3.5 w-3.5 text-muted-foreground ml-auto" />
                </button>
              )}
            </div>
          </div>

          {/* 4. Policy Content Matcher */}
          <PolicyContentMatcher
            paperId={paperId}
            subPersonaId={subPersonaId}
            policyTags={payload.policy_tags}
          />
        </>
      )}

      {/* Full-res infographic dialog */}
      <Dialog open={showFullRes} onOpenChange={setShowFullRes}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] p-2 flex items-center justify-center bg-background/95 backdrop-blur-sm">
          <img
            src={infographicUrl ?? ''}
            alt="Policy infographic"
            className="max-w-full max-h-[85vh] object-contain rounded-md"
          />
        </DialogContent>
      </Dialog>

      {/* Admin debug dialog */}
      <Dialog open={showDebug} onOpenChange={setShowDebug}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-sm font-sans">Three-Step Pipeline Debug</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="evidence" className="flex-1 flex flex-col min-h-0">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="evidence">Evidence</TabsTrigger>
              <TabsTrigger value="script">Script</TabsTrigger>
              <TabsTrigger value="persona">Persona</TabsTrigger>
              <TabsTrigger value="image">Image Prompt</TabsTrigger>
              <TabsTrigger value="modules">Modules</TabsTrigger>
            </TabsList>

            <TabsContent value="evidence" className="flex-1 min-h-0">
              <ScrollArea className="h-[50vh] rounded-md border border-border/40 p-3">
                <div className="rounded-md bg-muted/60 border border-border/40 p-3 mb-4 space-y-2">
                  <p className="text-xs font-sans font-semibold text-foreground">Step 0 — Policy Relevance Assessment</p>
                  <p className="text-xs font-sans text-muted-foreground leading-relaxed">
                    Uses <span className="font-semibold text-primary">{debugData?.model_step0 ?? 'openai/gpt-5'}</span>
                  </p>
                  <div className="flex gap-2 text-[11px] font-mono text-muted-foreground pt-1">
                    <span>Score: <span className="font-semibold">{debugData?.step0_result?.policy_relevance_score ?? '?'}/10</span></span>
                    <span>Gate: <span className="font-semibold">{(debugData?.step0_result?.policy_relevance_score ?? 0) >= 6 ? 'PASS' : 'BLOCKED'}</span></span>
                  </div>
                </div>
                {debugData?.step0_result && (
                  <div className="space-y-3 mb-4">
                    <div>
                      <p className="text-xs font-sans font-semibold text-foreground mb-1">Reason</p>
                      <p className="text-xs font-sans text-foreground/80 bg-muted/50 rounded p-2">{debugData.step0_result.reason}</p>
                    </div>
                    <div>
                      <p className="text-xs font-sans font-semibold text-foreground mb-1">Evidence Landscape</p>
                      <p className="text-xs font-sans text-foreground/80 bg-muted/50 rounded p-2">{debugData.step0_result.evidence_landscape}</p>
                    </div>
                  </div>
                )}
                <div className="border-t border-border/40 pt-3">
                  <p className="text-[11px] font-sans font-semibold text-foreground/70 uppercase tracking-wide mb-2">Step 0 Input</p>
                  <pre className="text-xs font-mono whitespace-pre-wrap text-foreground/80 bg-muted/50 rounded p-2">{debugData?.step0_input}</pre>
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="script" className="flex-1 min-h-0">
              <ScrollArea className="h-[50vh] rounded-md border border-border/40 p-3">
                <div className="rounded-md bg-muted/60 border border-border/40 p-3 mb-4 space-y-2">
                  <p className="text-xs font-sans font-semibold text-foreground">Step 1 — Script Generation</p>
                  <p className="text-xs font-sans text-muted-foreground leading-relaxed">
                    Uses <span className="font-semibold text-primary">{debugData?.model_step1 ?? 'openai/gpt-5.2'}</span>
                  </p>
                </div>
                {debugData?.script_result && (
                  <div className="space-y-3 mb-4">
                    <div>
                      <p className="text-xs font-sans font-semibold text-foreground mb-1">Generated Script</p>
                      <pre className="text-xs font-mono whitespace-pre-wrap text-foreground/80 bg-muted/50 rounded p-2">{JSON.stringify(debugData.script_result, null, 2)}</pre>
                    </div>
                  </div>
                )}
                <div className="border-t border-border/40 pt-3">
                  <p className="text-[11px] font-sans font-semibold text-foreground/70 uppercase tracking-wide mb-2">Step 1 Prompt</p>
                  <pre className="text-xs font-mono whitespace-pre-wrap text-foreground/80 bg-muted/50 rounded p-2">{debugData?.script_prompt}</pre>
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="persona" className="flex-1 min-h-0">
              <ScrollArea className="h-[50vh] rounded-md border border-border/40 p-3">
                <div className="rounded-md bg-muted/60 border border-border/40 p-3 mb-4 space-y-2">
                  <p className="text-xs font-sans font-semibold text-foreground">Persona Variables</p>
                </div>
                {debugData?.persona_variables && (
                  <pre className="text-xs font-mono whitespace-pre-wrap text-foreground/80 bg-muted/50 rounded p-2">{JSON.stringify(debugData.persona_variables, null, 2)}</pre>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="image" className="flex-1 min-h-0">
              <ScrollArea className="h-[50vh] rounded-md border border-border/40 p-3">
                <div className="rounded-md bg-muted/60 border border-border/40 p-3 mb-4 space-y-2">
                  <p className="text-xs font-sans font-semibold text-foreground">Step 2 — Image Generation</p>
                  <p className="text-xs font-sans text-muted-foreground leading-relaxed">
                    Uses <span className="font-semibold text-primary">{debugData?.model_step2 ?? 'google/gemini-3-pro-image-preview'}</span>
                  </p>
                </div>
                <pre className="text-xs font-mono whitespace-pre-wrap text-foreground/90">{debugData?.image_prompt}</pre>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="modules" className="flex-1 min-h-0">
              <ScrollArea className="h-[50vh] rounded-md border border-border/40 p-3">
                {(['M1', 'M2', 'M5'] as const).map((key) => (
                  <div key={key} className="mb-4">
                    <p className="text-xs font-sans font-semibold text-primary mb-1">{key}</p>
                    {debugData?.modules_used?.[key] ? (
                      <pre className="text-xs font-mono whitespace-pre-wrap text-foreground/80 bg-muted/50 rounded p-2">{JSON.stringify(debugData.modules_used[key], null, 2)}</pre>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">Not available</p>
                    )}
                  </div>
                ))}
                <div className="border-t border-border/40 pt-3 space-y-3">
                  <div>
                    <p className="text-xs font-sans font-semibold text-foreground mb-1">Claims ({debugData?.claims_extracted?.length ?? 0})</p>
                    <pre className="text-xs font-mono whitespace-pre-wrap text-foreground/80 bg-muted/50 rounded p-2">{JSON.stringify(debugData?.claims_extracted, null, 2)}</pre>
                  </div>
                  <div>
                    <p className="text-xs font-sans font-semibold text-foreground mb-1">Metrics ({debugData?.metrics_extracted?.length ?? 0})</p>
                    <pre className="text-xs font-mono whitespace-pre-wrap text-foreground/80 bg-muted/50 rounded p-2">{JSON.stringify(debugData?.metrics_extracted, null, 2)}</pre>
                  </div>
                  <div>
                    <p className="text-xs font-sans font-semibold text-foreground mb-1">Actions</p>
                    <pre className="text-xs font-mono whitespace-pre-wrap text-foreground/80 bg-muted/50 rounded p-2">{JSON.stringify(debugData?.actions_extracted, null, 2)}</pre>
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Policy Brief dialog */}
      {payload && (
        <Dialog open={showBrief} onOpenChange={setShowBrief}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-sans text-base leading-snug">
                Policy Brief
                {paperTitle && <span className="block text-sm font-normal text-muted-foreground mt-1 line-clamp-2">{paperTitle}</span>}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-5 pt-1">
              <div className="flex items-center gap-2">
                <Badge className={cn('font-sans text-xs border', qualityColor)}>
                  {payload.policy_brief.evidence_quality} Evidence
                </Badge>
                <span className="text-xs text-muted-foreground font-sans">
                  Relevance: <span className={cn('font-bold', scoreColor)}>{payload.executive_strip.relevance_score}/10</span>
                </span>
              </div>

              {payload.policy_brief.key_claims_summary.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold font-sans text-muted-foreground uppercase tracking-wide mb-2">Key Findings</h4>
                  <ul className="space-y-1.5">
                    {payload.policy_brief.key_claims_summary.map((claim, i) => (
                      <li key={i} className="flex gap-2 text-sm font-sans text-foreground">
                        <span className="mt-0.5 text-primary shrink-0">•</span>
                        <span className="leading-relaxed">{claim}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {payload.policy_brief.recommended_actions.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold font-sans text-muted-foreground uppercase tracking-wide mb-2">Recommended Actions</h4>
                  <ul className="space-y-1.5">
                    {payload.policy_brief.recommended_actions.map((action, i) => (
                      <li key={i} className="flex gap-2 text-sm font-sans text-foreground">
                        <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                        <span className="leading-relaxed">{action}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {payload.policy_brief.full_brief_text && (
                <div>
                  <h4 className="text-xs font-semibold font-sans text-muted-foreground uppercase tracking-wide mb-2">Full Policy Brief</h4>
                  <div className="text-sm font-sans text-foreground leading-relaxed whitespace-pre-line bg-muted/40 rounded-md p-4 border border-border/40">
                    {payload.policy_brief.full_brief_text}
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default PolicyMakerView;
