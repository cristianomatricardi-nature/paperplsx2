import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Clock, Wrench, FlaskConical, Monitor, Thermometer, ChevronDown, ChevronUp, Sparkles, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface StepData {
  id?: string;
  title?: string;
  description?: string;
  tools?: string[];
  reagents?: string[];
  software?: string[];
  conditions?: string[];
  duration?: string | null;
  critical_notes?: string[];
  page_numbers?: number[];
  depends_on?: string[];
}

const toArray = (val: unknown): string[] =>
  Array.isArray(val) ? val : typeof val === 'string' ? [val] : [];

function FlowCard({ step, index, total, moduleId }: { step: StepData; index: number; total: number; moduleId?: string }) {
  const [expanded, setExpanded] = useState(false);
  const tools = toArray(step.tools);
  const reagents = toArray(step.reagents);
  const software = toArray(step.software);
  const conditions = toArray(step.conditions);
  const criticalNotes = toArray(step.critical_notes);
  const pages = toArray(step.page_numbers).map(Number).filter(Boolean);

  return (
    <div className="relative flex flex-col items-center">
      {/* Connector line from previous */}
      {index > 0 && (
        <div className="w-px h-6 bg-border" />
      )}
      {/* Arrow indicator */}
      {index > 0 && (
        <div className="w-0 h-0 border-l-[5px] border-r-[5px] border-t-[6px] border-l-transparent border-r-transparent border-t-border -mt-px mb-1" />
      )}

      <Card
        draggable
        onDragStart={(e) => {
          e.stopPropagation();
          e.dataTransfer.setData('application/json', JSON.stringify({
            sourceModule: moduleId ?? 'M3',
            type: 'method_step',
            title: step.title ?? `Step ${index + 1}`,
            data: step,
          }));
          e.dataTransfer.effectAllowed = 'copy';
        }}
        className={cn(
          'w-full cursor-grab active:cursor-grabbing transition-all hover:shadow-md border-border',
          expanded && 'ring-1 ring-primary/30'
        )}
        onClick={() => setExpanded(!expanded)}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {/* Step badge */}
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
              {index + 1}
            </span>

            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-foreground leading-tight">{step.title}</p>
                {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
              </div>

              {/* Compact badges row */}
              <div className="flex flex-wrap gap-1.5">
                {step.duration && (
                  <Badge variant="secondary" className="text-[10px] gap-1">
                    <Clock className="h-2.5 w-2.5" /> {step.duration}
                  </Badge>
                )}
                {tools.length > 0 && (
                  <Badge variant="secondary" className="text-[10px] gap-1">
                    <Wrench className="h-2.5 w-2.5" /> {tools.length} instruments
                  </Badge>
                )}
                {reagents.length > 0 && (
                  <Badge variant="secondary" className="text-[10px] gap-1">
                    <FlaskConical className="h-2.5 w-2.5" /> {reagents.length} reagents
                  </Badge>
                )}
                {software.length > 0 && (
                  <Badge variant="secondary" className="text-[10px] gap-1">
                    <Monitor className="h-2.5 w-2.5" /> {software.length} software
                  </Badge>
                )}
              </div>

              {/* Expanded details */}
              {expanded && (
                <div className="space-y-3 pt-2 border-t border-border mt-2">
                  {step.description && (
                    <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
                  )}

                  {/* Tools/reagents/software chips */}
                  {(tools.length > 0 || reagents.length > 0 || software.length > 0) && (
                    <div className="flex flex-wrap gap-1.5">
                      {tools.map((t, i) => (
                        <span key={`t-${i}`} className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">🔧 {t}</span>
                      ))}
                      {reagents.map((r, i) => (
                        <span key={`r-${i}`} className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">🧪 {r}</span>
                      ))}
                      {software.map((s, i) => (
                        <span key={`s-${i}`} className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">💻 {s}</span>
                      ))}
                    </div>
                  )}

                  {conditions.length > 0 && (
                    <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
                      <Thermometer className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                      <span>{conditions.join(' · ')}</span>
                    </div>
                  )}

                  {criticalNotes.length > 0 && (
                    <div className="rounded-md bg-destructive/5 border border-destructive/20 p-2.5 space-y-1">
                      {criticalNotes.map((note, i) => (
                        <p key={i} className="text-xs text-foreground">⚠️ {note}</p>
                      ))}
                    </div>
                  )}

                  {pages.length > 0 && (
                    <div className="flex gap-1">
                      {pages.map((p) => (
                        <span key={p} className="text-xs font-mono text-muted-foreground">p.{p}</span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Connector line to next */}
      {index < total - 1 && (
        <div className="w-px h-6 bg-border" />
      )}
    </div>
  );
}

interface ProtocolFlowViewProps {
  steps: StepData[];
  paperId?: number;
  moduleId?: string;
}

export function ProtocolFlowView({ steps, paperId, moduleId }: ProtocolFlowViewProps) {
  const [infographic, setInfographic] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const handleGenerateInfographic = async () => {
    if (!paperId) return;
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-protocol-infographic', {
        body: { paper_id: paperId, steps },
      });
      if (error) throw error;
      setInfographic(data?.infographic ?? null);
      toast.success('Infographic generated!');
    } catch (e: any) {
      console.error(e);
      toast.error('Failed to generate infographic');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-2">
      {/* Header with infographic button */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {steps.length} Protocol Steps
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={handleGenerateInfographic}
          disabled={generating}
          className="gap-1.5 text-xs"
        >
          {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          Generate Infographic
        </Button>
      </div>

      {/* Infographic display */}
      {infographic && (
        <Card className="mb-4 border-primary/20 bg-primary/5">
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-primary mb-2">AI-Generated Protocol Summary</p>
            <div className="text-sm text-foreground whitespace-pre-wrap">{infographic}</div>
          </CardContent>
        </Card>
      )}

      {/* Flow cards */}
      <div className="flex flex-col items-center">
        {steps.map((step, i) => (
          <FlowCard key={step.id ?? i} step={step} index={i} total={steps.length} moduleId={moduleId} />
        ))}
      </div>
    </div>
  );
}
