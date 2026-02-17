import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface PipelineStep {
  id: string;
  stage: 'data' | 'cleaning' | 'transform' | 'model' | 'output';
  title: string;
  description: string;
  author_choice: string;
  alternatives: string[];
  variables_involved: string[];
  sensitivity_note: string;
}

const STAGE_STYLES: Record<string, { bg: string; label: string }> = {
  data: { bg: 'bg-blue-500/15 text-blue-700 dark:text-blue-300', label: 'DATA' },
  cleaning: { bg: 'bg-amber-500/15 text-amber-700 dark:text-amber-300', label: 'CLEANING' },
  transform: { bg: 'bg-violet-500/15 text-violet-700 dark:text-violet-300', label: 'TRANSFORM' },
  model: { bg: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300', label: 'MODEL' },
  output: { bg: 'bg-rose-500/15 text-rose-700 dark:text-rose-300', label: 'OUTPUT' },
};

interface DecisionPointCardProps {
  step: PipelineStep;
  onToggleAlternative?: (stepId: string, alternative: string) => void;
  activeAlternative?: string | null;
}

export function DecisionPointCard({ step, onToggleAlternative, activeAlternative }: DecisionPointCardProps) {
  const style = STAGE_STYLES[step.stage] ?? STAGE_STYLES.data;

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="flex items-start gap-3 p-4">
        <Badge className={cn('text-[10px] font-mono shrink-0 mt-0.5', style.bg)} variant="outline">
          {style.label}
        </Badge>
        <div className="flex-1 min-w-0 space-y-2">
          <h4 className="text-sm font-semibold text-foreground font-sans">{step.title}</h4>
          <p className="text-xs text-muted-foreground font-sans">{step.description}</p>

          {/* Author's choice & alternatives */}
          <div className="space-y-1.5">
            <button
              onClick={() => onToggleAlternative?.(step.id, step.author_choice)}
              className={cn(
                'flex items-center gap-2 text-xs font-sans rounded-md px-2.5 py-1.5 border transition-colors w-full text-left',
                !activeAlternative || activeAlternative === step.author_choice
                  ? 'border-primary/40 bg-primary/5 text-foreground'
                  : 'border-border bg-background text-muted-foreground'
              )}
            >
              <span className={cn(
                'h-2 w-2 rounded-full shrink-0',
                !activeAlternative || activeAlternative === step.author_choice ? 'bg-primary' : 'bg-muted-foreground/30'
              )} />
              {step.author_choice}
              <Badge variant="secondary" className="ml-auto text-[9px] px-1 py-0">Author</Badge>
            </button>
            {step.alternatives.map((alt) => (
              <button
                key={alt}
                onClick={() => onToggleAlternative?.(step.id, alt)}
                className={cn(
                  'flex items-center gap-2 text-xs font-sans rounded-md px-2.5 py-1.5 border transition-colors w-full text-left',
                  activeAlternative === alt
                    ? 'border-accent/40 bg-accent/5 text-foreground'
                    : 'border-border bg-background text-muted-foreground hover:bg-muted/30'
                )}
              >
                <span className={cn(
                  'h-2 w-2 rounded-full shrink-0',
                  activeAlternative === alt ? 'bg-accent' : 'bg-muted-foreground/30'
                )} />
                {alt}
              </button>
            ))}
          </div>

          {step.variables_involved.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {step.variables_involved.map((v) => (
                <Badge key={v} variant="outline" className="text-[9px] px-1.5 py-0 text-muted-foreground">
                  {v}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
