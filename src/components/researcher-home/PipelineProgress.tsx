import { Check, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PIPELINE_STEPS } from '@/lib/constants';
import type { PaperStatus } from '@/types/database';

interface PipelineProgressProps {
  status: PaperStatus;
  errorMessage?: string | null;
}

const statusIndex = (s: PaperStatus): number => {
  const idx = PIPELINE_STEPS.findIndex((step) => step.key === s);
  return idx === -1 ? -1 : idx;
};

export default function PipelineProgress({ status, errorMessage }: PipelineProgressProps) {
  const currentIdx = statusIndex(status);
  const isFailed = status === 'failed';

  const getStepState = (idx: number) => {
    if (isFailed) {
      // The step that was active when it failed
      if (idx <= currentIdx) return idx === currentIdx ? 'failed' : 'completed';
      return 'pending';
    }
    if (status === 'completed') return 'completed';
    if (idx < currentIdx) return 'completed';
    if (idx === currentIdx) return 'processing';
    return 'pending';
  };

  const statusText = () => {
    if (isFailed) return errorMessage || 'Processing failed';
    if (status === 'completed') return 'Processing complete';
    if (status === 'uploaded') return 'Queued for processing';
    const step = PIPELINE_STEPS.find((s) => s.key === status);
    return step ? `${step.label}…` : status;
  };

  return (
    <div className="space-y-2">
      {/* Stepper */}
      <div className="flex items-center">
        {PIPELINE_STEPS.map((step, idx) => {
          const state = getStepState(idx);
          return (
            <div key={step.key} className="flex items-center flex-1 last:flex-none">
              {/* Dot */}
              <div
                className={cn(
                  'relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-300',
                  state === 'completed' && 'border-[hsl(var(--deep-blue))] bg-[hsl(var(--deep-blue))]',
                  state === 'processing' && 'border-[hsl(var(--deep-blue))] bg-transparent',
                  state === 'pending' && 'border-muted-foreground/30 bg-transparent',
                  state === 'failed' && 'border-destructive bg-destructive',
                )}
              >
                {state === 'completed' && (
                  <Check className="h-3 w-3 text-[hsl(var(--deep-blue-foreground))]" />
                )}
                {state === 'processing' && (
                  <Loader2 className="h-3 w-3 animate-spin text-[hsl(var(--deep-blue))]" />
                )}
                {state === 'failed' && (
                  <X className="h-3 w-3 text-destructive-foreground" />
                )}
              </div>

              {/* Connecting line */}
              {idx < PIPELINE_STEPS.length - 1 && (
                <div
                  className={cn(
                    'h-0.5 flex-1 transition-colors duration-300',
                    getStepState(idx + 1) === 'completed' || state === 'completed'
                      ? 'bg-[hsl(var(--deep-blue))]'
                      : 'bg-muted-foreground/20',
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Status text */}
      <p
        className={cn(
          'text-xs',
          isFailed ? 'text-destructive' : 'text-muted-foreground',
        )}
      >
        {statusText()}
      </p>
    </div>
  );
}
