import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronRight } from 'lucide-react';
import type { PipelineStep } from './DecisionPointCard';

interface SensitivityPanelProps {
  steps: PipelineStep[];
  activeAlternatives: Record<string, string>;
}

export function SensitivityPanel({ steps, activeAlternatives }: SensitivityPanelProps) {
  const activeSteps = steps.filter(
    (s) => activeAlternatives[s.id] && activeAlternatives[s.id] !== s.author_choice
  );

  if (activeSteps.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card shadow-sm p-4">
        <p className="text-xs text-muted-foreground text-center font-sans">
          Toggle an alternative choice above to see what-if analysis here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {activeSteps.map((step) => (
        <Collapsible key={step.id} defaultOpen>
          <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
            <CollapsibleTrigger className="flex w-full items-center gap-2 px-4 py-3 text-xs font-sans font-semibold text-foreground hover:bg-muted/40 transition-colors">
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground transition-transform [[data-state=open]>&]:rotate-90" />
              <span>
                Switch "{step.title}" → {activeAlternatives[step.id]}
              </span>
            </CollapsibleTrigger>
            <CollapsibleContent className="px-4 pb-4">
              <p className="text-xs text-muted-foreground font-sans leading-relaxed">
                {step.sensitivity_note}
              </p>
            </CollapsibleContent>
          </div>
        </Collapsible>
      ))}
    </div>
  );
}
