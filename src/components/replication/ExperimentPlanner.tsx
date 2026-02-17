import { useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { GripVertical, X, FlaskConical } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MethodStep } from '@/types/structured-paper';
import type { RequirementStatus } from '@/components/replication/GapSummary';
import { buildRequirements } from '@/hooks/useReplicationData';

interface ExperimentPlannerProps {
  plannedSteps: MethodStep[];
  onUpdateSteps: (steps: MethodStep[]) => void;
  inventory: { item_name: string; item_type: string; model_number: string | null }[];
}

export function ExperimentPlanner({ plannedSteps, onUpdateSteps, inventory }: ExperimentPlannerProps) {
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent, index?: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index ?? plannedSteps.length);
  }, [plannedSteps.length]);

  const handleDrop = useCallback((e: React.DragEvent, targetIndex?: number) => {
    e.preventDefault();
    setDragOverIndex(null);

    try {
      const raw = e.dataTransfer.getData('application/json');
      if (!raw) return;
      const method: MethodStep = JSON.parse(raw);

      // Check if already in planner
      if (plannedSteps.some(s => s.id === method.id)) return;

      const newSteps = [...plannedSteps];
      const insertAt = targetIndex ?? newSteps.length;
      newSteps.splice(insertAt, 0, method);
      onUpdateSteps(newSteps);
    } catch {
      // Reorder within planner
      const reorderIdx = e.dataTransfer.getData('text/plain');
      if (reorderIdx && targetIndex !== undefined) {
        const fromIdx = parseInt(reorderIdx);
        if (isNaN(fromIdx) || fromIdx === targetIndex) return;
        const newSteps = [...plannedSteps];
        const [moved] = newSteps.splice(fromIdx, 1);
        newSteps.splice(targetIndex > fromIdx ? targetIndex - 1 : targetIndex, 0, moved);
        onUpdateSteps(newSteps);
      }
    }
  }, [plannedSteps, onUpdateSteps]);

  const handleDragLeave = useCallback(() => setDragOverIndex(null), []);

  const removeStep = useCallback((index: number) => {
    const newSteps = [...plannedSteps];
    newSteps.splice(index, 1);
    onUpdateSteps(newSteps);
  }, [plannedSteps, onUpdateSteps]);

  const getStepReqs = (step: MethodStep): RequirementStatus[] => buildRequirements(step, inventory);

  if (plannedSteps.length === 0) {
    return (
      <div
        className={cn(
          'rounded-lg border-2 border-dashed p-8 text-center transition-colors',
          dragOverIndex !== null ? 'border-primary bg-primary/5' : 'border-border'
        )}
        onDragOver={(e) => handleDragOver(e)}
        onDrop={(e) => handleDrop(e)}
        onDragLeave={handleDragLeave}
      >
        <FlaskConical className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
        <p className="text-sm font-medium text-foreground mb-1">Drag protocol steps here</p>
        <p className="text-xs text-muted-foreground">
          Drag methods from the left to build your experiment plan
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
        Experiment Plan ({plannedSteps.length} steps)
      </p>
      {plannedSteps.map((step, i) => {
        const reqs = getStepReqs(step);
        const available = reqs.filter(r => r.status === 'available').length;
        const missing = reqs.filter(r => r.status === 'missing').length;

        return (
          <div key={step.id}>
            {/* Drop indicator */}
            <div
              className={cn(
                'h-1 rounded-full transition-colors mb-1',
                dragOverIndex === i ? 'bg-primary' : 'bg-transparent'
              )}
              onDragOver={(e) => handleDragOver(e, i)}
              onDrop={(e) => handleDrop(e, i)}
              onDragLeave={handleDragLeave}
            />
            <Card
              className="border-border"
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('text/plain', String(i));
              }}
            >
              <CardContent className="p-3 flex items-center gap-2">
                <GripVertical className="h-4 w-4 text-muted-foreground shrink-0 cursor-grab" />
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{step.title}</p>
                  <div className="flex gap-2 mt-0.5">
                    {reqs.length > 0 && (
                      <span className="text-[10px] text-muted-foreground">
                        {available}/{reqs.length} ready
                      </span>
                    )}
                    {missing > 0 && (
                      <Badge variant="destructive" className="text-[10px] h-4">{missing} missing</Badge>
                    )}
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => removeStep(i)}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </CardContent>
            </Card>
          </div>
        );
      })}
      {/* Final drop zone */}
      <div
        className={cn(
          'h-8 rounded-lg border-2 border-dashed transition-colors flex items-center justify-center',
          dragOverIndex === plannedSteps.length ? 'border-primary bg-primary/5' : 'border-transparent'
        )}
        onDragOver={(e) => handleDragOver(e, plannedSteps.length)}
        onDrop={(e) => handleDrop(e, plannedSteps.length)}
        onDragLeave={handleDragLeave}
      >
        {dragOverIndex === plannedSteps.length && (
          <span className="text-xs text-primary">Drop here</span>
        )}
      </div>
    </div>
  );
}
