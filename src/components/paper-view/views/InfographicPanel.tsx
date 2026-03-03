import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ImageIcon, Sparkles, AlertCircle, Code } from 'lucide-react';
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
  prompt_text: string;
  model: string;
  modules_used: { M1: any; M2: any; M5: any };
  pdf_included: boolean;
  claims_extracted: any[];
  metrics_extracted: any[];
  actions_extracted: { policy: string[]; research: string[] };
}

const InfographicPanel = ({ paperId, paperTitle, infographicSpec, subPersonaId }: InfographicPanelProps) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [debugData, setDebugData] = useState<DebugPayload | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [showFullRes, setShowFullRes] = useState(false);
  const { isAdmin } = useUserRole();

  const handleGenerate = async () => {
    setGenerating(true);
    setGenError(null);
    try {
      const result = await generatePolicyInfographic(paperId, paperTitle ?? 'Research Paper', infographicSpec, subPersonaId);
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
          {!imageUrl && (
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
              <p className="text-xs text-muted-foreground font-sans text-center">Generating infographic…</p>
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
              variant={imageUrl ? 'outline' : 'default'}
              size="sm"
              className="flex-1 gap-1.5"
              onClick={handleGenerate}
              disabled={generating}
            >
              <Sparkles className="h-3.5 w-3.5" />
              {imageUrl ? 'Regenerate Infographic' : 'Generate Infographic'}
            </Button>

            {isAdmin && debugData && (
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-muted-foreground"
                onClick={() => setShowDebug(true)}
              >
                <Code className="h-3.5 w-3.5" />
                Show Prompt
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Admin debug dialog */}
      <Dialog open={showDebug} onOpenChange={setShowDebug}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-sm font-sans">Generation Debug — {debugData?.model}</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="prompt" className="flex-1 flex flex-col min-h-0">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="prompt">Prompt</TabsTrigger>
              <TabsTrigger value="modules">Modules</TabsTrigger>
              <TabsTrigger value="assets">Assets</TabsTrigger>
            </TabsList>

            <TabsContent value="prompt" className="flex-1 min-h-0">
              <ScrollArea className="h-[50vh] rounded-md border border-border/40 p-3">
                <pre className="text-xs font-mono whitespace-pre-wrap text-foreground/90">
                  {debugData?.prompt_text}
                </pre>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="modules" className="flex-1 min-h-0">
              <ScrollArea className="h-[50vh] rounded-md border border-border/40 p-3 space-y-4">
                {(['M1', 'M2', 'M5'] as const).map((key) => (
                  <div key={key} className="mb-4">
                    <p className="text-xs font-sans font-semibold text-primary mb-1">{key}</p>
                    {debugData?.modules_used[key] ? (
                      <pre className="text-xs font-mono whitespace-pre-wrap text-foreground/80 bg-muted/50 rounded p-2">
                        {JSON.stringify(debugData.modules_used[key], null, 2)}
                      </pre>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">Not available</p>
                    )}
                  </div>
                ))}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="assets" className="flex-1 min-h-0">
              <ScrollArea className="h-[50vh] rounded-md border border-border/40 p-3">
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-sans font-semibold text-foreground mb-1">PDF Page Included</p>
                    <p className="text-xs text-muted-foreground">{debugData?.pdf_included ? 'Yes — first page sent as image context' : 'No'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-sans font-semibold text-foreground mb-1">Claims Extracted ({debugData?.claims_extracted?.length ?? 0})</p>
                    <pre className="text-xs font-mono whitespace-pre-wrap text-foreground/80 bg-muted/50 rounded p-2">
                      {JSON.stringify(debugData?.claims_extracted, null, 2)}
                    </pre>
                  </div>
                  <div>
                    <p className="text-xs font-sans font-semibold text-foreground mb-1">Metrics Extracted ({debugData?.metrics_extracted?.length ?? 0})</p>
                    <pre className="text-xs font-mono whitespace-pre-wrap text-foreground/80 bg-muted/50 rounded p-2">
                      {JSON.stringify(debugData?.metrics_extracted, null, 2)}
                    </pre>
                  </div>
                  <div>
                    <p className="text-xs font-sans font-semibold text-foreground mb-1">Actions Extracted</p>
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
