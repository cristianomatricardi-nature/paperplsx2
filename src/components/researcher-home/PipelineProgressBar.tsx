import { FileText, Brain, Database, ImageIcon, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { PIPELINE_STEPS, type PaperStatus } from '@/lib/constants';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

const STEP_ICONS: Record<PaperStatus, React.ElementType> = {
  parsing: FileText,
  structuring: Brain,
  chunking: Database,
  extracting_figures: ImageIcon,
  completed: CheckCircle2,
};

interface PipelineProgressBarProps {
  status: string | null;
  errorMessage?: string | null;
}

type StepState = 'pending' | 'active' | 'completed' | 'failed';

export default function PipelineProgressBar({ status, errorMessage }: PipelineProgressBarProps) {
  const currentIndex = PIPELINE_STEPS.findIndex((s) => s.key === status);
  const isFailed = status === 'failed';

  const getStepState = (index: number): StepState => {
    if (isFailed) {
      // The step that was active when failure occurred
      return index < currentIndex ? 'completed' : index === currentIndex ? 'failed' : 'pending';
    }
    if (currentIndex === -1) return index === 0 ? 'active' : 'pending'; // uploading phase
    if (index < currentIndex) return 'completed';
    if (index === currentIndex) return status === 'completed' ? 'completed' : 'active';
    return 'pending';
  };

  const getProgressValue = (state: StepState) => {
    if (state === 'completed') return 100;
    if (state === 'active') return 60; // indeterminate-ish
    return 0;
  };

  return (
    <div className="space-y-3 py-2">
      {PIPELINE_STEPS.map((step, i) => {
        const state = getStepState(i);
        const Icon = STEP_ICONS[step.key];

        return (
          <div key={step.key} className="flex items-center gap-3">
            {/* Icon */}
            <div
              className={cn(
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors',
                state === 'completed' && 'bg-primary/15 text-primary',
                state === 'active' && 'bg-primary/10 text-primary',
                state === 'pending' && 'bg-muted text-muted-foreground',
                state === 'failed' && 'bg-destructive/15 text-destructive',
              )}
            >
              {state === 'active' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : state === 'failed' ? (
                <AlertCircle className="h-4 w-4" />
              ) : state === 'completed' ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <Icon className="h-4 w-4" />
              )}
            </div>

            {/* Label + bar */}
            <div className="flex-1 space-y-1">
              <span
                className={cn(
                  'text-sm font-medium',
                  state === 'pending' && 'text-muted-foreground',
                  state === 'active' && 'text-foreground',
                  state === 'completed' && 'text-foreground',
                  state === 'failed' && 'text-destructive',
                )}
              >
                {step.label}
              </span>
              <Progress
                value={getProgressValue(state)}
                className={cn(
                  'h-1.5',
                  state === 'active' && '[&>div]:animate-pulse',
                  state === 'completed' && '[&>div]:bg-primary',
                  state === 'failed' && '[&>div]:bg-destructive',
                  state === 'pending' && '[&>div]:bg-muted',
                )}
              />
            </div>
          </div>
        );
      })}

      {/* Status text */}
      {isFailed && errorMessage && (
        <p className="mt-2 text-sm text-destructive">{errorMessage}</p>
      )}
    </div>
  );
}
