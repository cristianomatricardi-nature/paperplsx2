import { DecisionPointCard, type PipelineStep } from './DecisionPointCard';

interface PipelineFlowViewProps {
  steps: PipelineStep[];
  activeAlternatives: Record<string, string>;
  onToggleAlternative: (stepId: string, alternative: string) => void;
}

export function PipelineFlowView({ steps, activeAlternatives, onToggleAlternative }: PipelineFlowViewProps) {
  if (steps.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8 font-sans">
        No pipeline steps yet. Click "AI Decompose" to analyze the dropped items.
      </p>
    );
  }

  return (
    <div className="space-y-0">
      {steps.map((step, idx) => (
        <div key={step.id}>
          <DecisionPointCard
            step={step}
            activeAlternative={activeAlternatives[step.id] ?? null}
            onToggleAlternative={onToggleAlternative}
          />
          {idx < steps.length - 1 && (
            <div className="flex justify-center py-1">
              <div className="w-px h-6 bg-border" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
