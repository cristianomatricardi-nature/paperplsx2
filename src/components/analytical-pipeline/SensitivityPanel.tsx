import { Badge } from '@/components/ui/badge';
import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PipelineStep } from './DecisionPointCard';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ResponsiveContainer,
} from 'recharts';

interface SensitivityPanelProps {
  steps: PipelineStep[];
  activeAlternatives: Record<string, string>;
  onToggleAlternative: (stepId: string, alternative: string) => void;
}

export function SensitivityPanel({ steps, activeAlternatives, onToggleAlternative }: SensitivityPanelProps) {
  if (steps.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card shadow-sm p-4">
        <p className="text-xs text-muted-foreground text-center font-sans">
          No decision points yet. Run AI Decompose to populate the sandbox.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {steps.map((step) => {
        const selected = activeAlternatives[step.id] || '';
        const authorEffect = (step as any).mock_effect_size ?? +(0.4 + Math.random() * 0.5).toFixed(2);
        const altEffects: number[] = (step as any).mock_alt_effect_sizes ??
          step.alternatives.map(() => +(0.2 + Math.random() * 0.6).toFixed(2));

        const chartData = [
          { name: step.author_choice, value: authorEffect, isAuthor: true, isSelected: !selected || selected === step.author_choice },
          ...step.alternatives.map((alt, i) => ({
            name: alt,
            value: altEffects[i] ?? +(0.3 + Math.random() * 0.5).toFixed(2),
            isAuthor: false,
            isSelected: selected === alt,
          })),
        ];

        return (
          <div key={step.id} className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="p-4 space-y-3">
              {/* Title */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="text-sm font-semibold text-foreground font-sans">{step.title}</h4>
                  <p className="text-xs text-muted-foreground font-sans mt-0.5">{step.description}</p>
                </div>
                <Badge variant="outline" className="text-[9px] gap-1 text-muted-foreground shrink-0">
                  <Info className="h-2.5 w-2.5" />
                  Simulated
                </Badge>
              </div>

              {/* Toggles */}
              <div className="space-y-1.5">
                <button
                  onClick={() => onToggleAlternative(step.id, step.author_choice)}
                  className={cn(
                    'flex items-center gap-2 text-xs font-sans rounded-md px-2.5 py-1.5 border transition-colors w-full text-left',
                    !selected || selected === step.author_choice
                      ? 'border-primary/40 bg-primary/5 text-foreground'
                      : 'border-border bg-background text-muted-foreground hover:bg-muted/30'
                  )}
                >
                  <span className={cn(
                    'h-2 w-2 rounded-full shrink-0',
                    !selected || selected === step.author_choice ? 'bg-primary' : 'bg-muted-foreground/30'
                  )} />
                  {step.author_choice}
                  <Badge variant="secondary" className="ml-auto text-[9px] px-1 py-0">Author</Badge>
                </button>
                {step.alternatives.map((alt) => (
                  <button
                    key={alt}
                    onClick={() => onToggleAlternative(step.id, alt)}
                    className={cn(
                      'flex items-center gap-2 text-xs font-sans rounded-md px-2.5 py-1.5 border transition-colors w-full text-left',
                      selected === alt
                        ? 'border-accent/40 bg-accent/5 text-foreground'
                        : 'border-border bg-background text-muted-foreground hover:bg-muted/30'
                    )}
                  >
                    <span className={cn(
                      'h-2 w-2 rounded-full shrink-0',
                      selected === alt ? 'bg-accent' : 'bg-muted-foreground/30'
                    )} />
                    {alt}
                  </button>
                ))}
              </div>

              {/* Bar chart */}
              <div className="pt-1">
                <ResponsiveContainer width="100%" height={140}>
                  <BarChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="name" tick={{ fontSize: 9 }} className="text-muted-foreground" interval={0} />
                    <YAxis tick={{ fontSize: 9 }} domain={[0, 1]} className="text-muted-foreground" label={{ value: 'Effect size', angle: -90, position: 'insideLeft', fontSize: 9, className: 'fill-muted-foreground' }} />
                    <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]} animationDuration={400}>
                      {chartData.map((entry, index) => (
                        <Cell
                          key={index}
                          fill={entry.isSelected
                            ? (entry.isAuthor ? 'hsl(var(--primary))' : 'hsl(var(--accent))')
                            : 'hsl(var(--muted-foreground) / 0.2)'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Sensitivity note */}
              {step.sensitivity_note && (
                <p className="text-xs text-muted-foreground font-sans leading-relaxed border-l-2 border-primary/20 pl-3">
                  {step.sensitivity_note}
                </p>
              )}
            </div>
          </div>
        );
      })}

      {/* Global disclaimer */}
      <p className="text-[10px] text-muted-foreground/60 text-center font-sans">
        Simulated data generated from the manuscript for demonstration — actual figure extraction coming soon.
      </p>
    </div>
  );
}
