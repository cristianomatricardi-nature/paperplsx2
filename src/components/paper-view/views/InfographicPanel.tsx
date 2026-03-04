import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ImageIcon, Sparkles, AlertCircle, Code, ShieldX } from 'lucide-react';
import { generatePolicyInfographic } from '@/lib/api';
import { toast } from 'sonner';
import { useUserRole } from '@/hooks/useUserRole';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { PolicyViewPayload } from '@/hooks/usePolicyView';

interface InfographicPanelProps {
  paperId: number;
  paperTitle: string | null;
  infographicSpec: PolicyViewPayload['infographic_spec'];
  subPersonaId?: string;
}

interface DebugPayload {
  step0_input?: string;
  step0_result?: { policy_relevance_score: number; reason: string; evidence_landscape: string };
  script_prompt?: string;
  script_result?: {
    header: string;
    evidence_landscape: string;
    key_findings: { label: string; value: string; icon_hint?: string }[];
    recommendations: string[];
    key_takeaway: string;
    source_citation: string;
    disclaimer?: string;
  };
  image_prompt?: string;
  persona_variables?: Record<string, any>;
  model_step0?: string;
  model_step1?: string;
  model_step2?: string;
  modules_used: { M1: any; M2: any; M5: any };
  pdf_included?: boolean;
  claims_extracted?: any[];
  metrics_extracted?: any[];
  actions_extracted?: { policy: string[]; research: string[] };
}

const InfographicPanel = ({ paperId, paperTitle, infographicSpec, subPersonaId }: InfographicPanelProps) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [debugData, setDebugData] = useState<DebugPayload | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [showFullRes, setShowFullRes] = useState(false);
  const [notRelevant, setNotRelevant] = useState<string | null>(null);
  const [relevanceScore, setRelevanceScore] = useState<number | null>(null);
  const { isAdmin } = useUserRole();

  const handleGenerate = async () => {
    setGenerating(true);
    setGenError(null);
    setNotRelevant(null);
    setRelevanceScore(null);
    try {
      const result = await generatePolicyInfographic(paperId, paperTitle ?? 'Research Paper', infographicSpec, subPersonaId);

      // Handle policy relevance gate (score ≤ 5 = not relevant)
      if (result?.policy_relevant === false) {
        const score = result.policy_relevance_score ?? 0;
        setRelevanceScore(score);
        setNotRelevant(result.reason ?? 'This research does not have clear policy implications.');
        if (result.debug) setDebugData(result.debug);
        toast.info(`Policy relevance score: ${score}/10 — below threshold`);
        return;
      }

      if (result?.image_url) {
        setImageUrl(result.image_url);
        if (result.debug) setDebugData(result.debug);
        toast.success('Infographic generated');
      } else {
        throw new Error(result?.error ?? 'No image URL returned');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to generate infographic';
      setGenError(msg);
      toast.error(msg);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <>
      <Card className="border-border/60 flex flex-col">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-sans font-semibold">
              {infographicSpec.title || 'Policy Infographic'}
            </CardTitle>
          </div>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col gap-3">
          {/* Policy not relevant card */}
          {notRelevant && (
            <div className="rounded-md border border-muted bg-muted/40 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-sans font-semibold text-foreground">
                  <ShieldX className="h-4 w-4 text-muted-foreground" />
                  No Policy Relevance Detected
                </div>
                {relevanceScore !== null && (
                  <span className="text-xs font-mono font-semibold text-muted-foreground bg-muted rounded px-1.5 py-0.5">
                    {relevanceScore}/10
                  </span>
                )}
              </div>
              <p className="text-xs font-sans text-muted-foreground leading-relaxed">{notRelevant}</p>
              <p className="text-xs font-sans text-muted-foreground italic">
                Policy relevance score {relevanceScore ?? '?'}/10 (threshold: 6). No infographic was generated.
              </p>
            </div>
          )}

          {!imageUrl && !notRelevant && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground font-sans font-medium">Key sections:</p>
              <ul className="space-y-1">
                {infographicSpec.sections.map((s, i) => (
                  <li key={i} className="flex gap-2 text-xs font-sans text-foreground/80">
                    <span className="text-primary font-semibold shrink-0">{i + 1}.</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground font-sans mt-2 italic leading-relaxed">
                {infographicSpec.key_visual_description}
              </p>
            </div>
          )}

          {imageUrl && (
            <div
              className="rounded-md overflow-hidden border border-border/40 cursor-zoom-in"
              onClick={() => setShowFullRes(true)}
            >
              <img
                src={imageUrl}
                alt={`Policy infographic: ${infographicSpec.title}`}
                className="w-full object-cover"
              />
            </div>
          )}

          {generating && (
            <div className="space-y-2">
              <Skeleton className="h-40 w-full rounded-md" />
              <p className="text-xs text-muted-foreground font-sans text-center">
                Generating infographic (3-step pipeline)…
              </p>
            </div>
          )}

          {genError && (
            <div className="flex items-start gap-2 text-xs text-destructive font-sans">
              <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>{genError}</span>
            </div>
          )}

          <div className="mt-auto pt-2 flex gap-2">
            <Button
              variant={imageUrl || notRelevant ? 'outline' : 'default'}
              size="sm"
              className="flex-1 gap-1.5"
              onClick={handleGenerate}
              disabled={generating}
            >
              <Sparkles className="h-3.5 w-3.5" />
              {imageUrl ? 'Regenerate' : notRelevant ? 'Re-assess' : 'Generate Infographic'}
            </Button>

            {isAdmin && debugData && (
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-muted-foreground"
                onClick={() => setShowDebug(true)}
              >
                <Code className="h-3.5 w-3.5" />
                Debug
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Admin debug dialog */}
      <Dialog open={showDebug} onOpenChange={setShowDebug}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-sm font-sans">
              Three-Step Pipeline Debug
            </DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="evidence" className="flex-1 flex flex-col min-h-0">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="evidence">Evidence</TabsTrigger>
              <TabsTrigger value="script">Script</TabsTrigger>
              <TabsTrigger value="persona">Persona</TabsTrigger>
              <TabsTrigger value="image">Image Prompt</TabsTrigger>
              <TabsTrigger value="modules">Modules</TabsTrigger>
            </TabsList>

            {/* Step 0 — Evidence / Policy Relevance */}
            <TabsContent value="evidence" className="flex-1 min-h-0">
              <ScrollArea className="h-[50vh] rounded-md border border-border/40 p-3">
                <div className="rounded-md bg-muted/60 border border-border/40 p-3 mb-4 space-y-2">
                  <p className="text-xs font-sans font-semibold text-foreground">Step 0 — Policy Relevance Assessment</p>
                  <p className="text-xs font-sans text-muted-foreground leading-relaxed">
                    Uses <span className="font-semibold text-primary">{debugData?.model_step0 ?? 'openai/gpt-5'}</span> to critically assess whether this research has genuine policy implications before generating an infographic.
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
                  <pre className="text-xs font-mono whitespace-pre-wrap text-foreground/80 bg-muted/50 rounded p-2">
                    {debugData?.step0_input}
                  </pre>
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Step 1 — Script */}
            <TabsContent value="script" className="flex-1 min-h-0">
              <ScrollArea className="h-[50vh] rounded-md border border-border/40 p-3">
                <div className="rounded-md bg-muted/60 border border-border/40 p-3 mb-4 space-y-2">
                  <p className="text-xs font-sans font-semibold text-foreground">Step 1 — Script Generation</p>
                  <p className="text-xs font-sans text-muted-foreground leading-relaxed">
                    Uses <span className="font-semibold text-primary">{debugData?.model_step1 ?? 'openai/gpt-5.2'}</span> with persona-specific variables to generate a structured infographic script via tool calling.
                  </p>
                </div>

                {debugData?.script_result && (
                  <div className="space-y-3 mb-4">
                    <div>
                      <p className="text-xs font-sans font-semibold text-foreground mb-1">Generated Script</p>
                      <pre className="text-xs font-mono whitespace-pre-wrap text-foreground/80 bg-muted/50 rounded p-2">
                        {JSON.stringify(debugData.script_result, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}

                <div className="border-t border-border/40 pt-3">
                  <p className="text-[11px] font-sans font-semibold text-foreground/70 uppercase tracking-wide mb-2">Step 1 Prompt</p>
                  <pre className="text-xs font-mono whitespace-pre-wrap text-foreground/80 bg-muted/50 rounded p-2">
                    {debugData?.script_prompt}
                  </pre>
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Persona Variables */}
            <TabsContent value="persona" className="flex-1 min-h-0">
              <ScrollArea className="h-[50vh] rounded-md border border-border/40 p-3">
                <div className="rounded-md bg-muted/60 border border-border/40 p-3 mb-4 space-y-2">
                  <p className="text-xs font-sans font-semibold text-foreground">Persona Variables</p>
                  <p className="text-xs font-sans text-muted-foreground leading-relaxed">
                    These variables were injected into Step 1 to adapt the infographic script to the selected sub-persona.
                  </p>
                </div>

                {debugData?.persona_variables && (
                  <pre className="text-xs font-mono whitespace-pre-wrap text-foreground/80 bg-muted/50 rounded p-2">
                    {JSON.stringify(debugData.persona_variables, null, 2)}
                  </pre>
                )}
              </ScrollArea>
            </TabsContent>

            {/* Step 2 — Image Prompt */}
            <TabsContent value="image" className="flex-1 min-h-0">
              <ScrollArea className="h-[50vh] rounded-md border border-border/40 p-3">
                <div className="rounded-md bg-muted/60 border border-border/40 p-3 mb-4 space-y-2">
                  <p className="text-xs font-sans font-semibold text-foreground">Step 2 — Image Generation</p>
                  <p className="text-xs font-sans text-muted-foreground leading-relaxed">
                    Uses <span className="font-semibold text-primary">{debugData?.model_step2 ?? 'google/gemini-3-pro-image-preview'}</span> with the script sections, Springer Nature logo reference, and optional PDF page 1.
                  </p>
                  <div className="flex gap-3 text-[11px] font-mono text-muted-foreground pt-1">
                    <span>PDF included: <span className="font-semibold">{debugData?.pdf_included ? 'Yes' : 'No'}</span></span>
                    <span>Logo: <span className="font-semibold">SN reference image</span></span>
                  </div>
                </div>

                <pre className="text-xs font-mono whitespace-pre-wrap text-foreground/90">
                  {debugData?.image_prompt}
                </pre>
              </ScrollArea>
            </TabsContent>

            {/* Raw Modules */}
            <TabsContent value="modules" className="flex-1 min-h-0">
              <ScrollArea className="h-[50vh] rounded-md border border-border/40 p-3">
                {(['M1', 'M2', 'M5'] as const).map((key) => (
                  <div key={key} className="mb-4">
                    <p className="text-xs font-sans font-semibold text-primary mb-1">{key}</p>
                    {debugData?.modules_used?.[key] ? (
                      <pre className="text-xs font-mono whitespace-pre-wrap text-foreground/80 bg-muted/50 rounded p-2">
                        {JSON.stringify(debugData.modules_used[key], null, 2)}
                      </pre>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">Not available</p>
                    )}
                  </div>
                ))}

                <div className="border-t border-border/40 pt-3 space-y-3">
                  <div>
                    <p className="text-xs font-sans font-semibold text-foreground mb-1">Claims ({debugData?.claims_extracted?.length ?? 0})</p>
                    <pre className="text-xs font-mono whitespace-pre-wrap text-foreground/80 bg-muted/50 rounded p-2">
                      {JSON.stringify(debugData?.claims_extracted, null, 2)}
                    </pre>
                  </div>
                  <div>
                    <p className="text-xs font-sans font-semibold text-foreground mb-1">Metrics ({debugData?.metrics_extracted?.length ?? 0})</p>
                    <pre className="text-xs font-mono whitespace-pre-wrap text-foreground/80 bg-muted/50 rounded p-2">
                      {JSON.stringify(debugData?.metrics_extracted, null, 2)}
                    </pre>
                  </div>
                  <div>
                    <p className="text-xs font-sans font-semibold text-foreground mb-1">Actions</p>
                    <pre className="text-xs font-mono whitespace-pre-wrap text-foreground/80 bg-muted/50 rounded p-2">
                      {JSON.stringify(debugData?.actions_extracted, null, 2)}
                    </pre>
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Full-res image overlay */}
      <Dialog open={showFullRes} onOpenChange={setShowFullRes}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] p-2 flex items-center justify-center bg-background/95 backdrop-blur-sm">
          <img
            src={imageUrl ?? ''}
            alt={`Policy infographic: ${infographicSpec.title}`}
            className="max-w-full max-h-[85vh] object-contain rounded-md"
          />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default InfographicPanel;
