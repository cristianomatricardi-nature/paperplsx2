import { Badge } from '@/components/ui/badge';
import { Target } from 'lucide-react';
import type { LearningObjective } from '@/hooks/useEducatorView';

interface LearningObjectivesPanelProps {
  objectives: LearningObjective[];
}

const bloomColors: Record<string, string> = {
  remember: 'bg-slate-100 text-slate-700 border-slate-200',
  understand: 'bg-blue-100 text-blue-700 border-blue-200',
  apply: 'bg-green-100 text-green-700 border-green-200',
  analyze: 'bg-amber-100 text-amber-800 border-amber-200',
  evaluate: 'bg-orange-100 text-orange-700 border-orange-200',
  create: 'bg-violet-100 text-violet-700 border-violet-200',
};

const LearningObjectivesPanel = ({ objectives }: LearningObjectivesPanelProps) => {
  if (!objectives || objectives.length === 0) return null;

  return (
    <div>
      <h3 className="text-sm font-semibold font-sans text-foreground mb-3 uppercase tracking-wide flex items-center gap-2">
        <Target className="h-4 w-4" />
        Learning Objectives
      </h3>
      <div className="space-y-2">
        {objectives.map((obj, i) => (
          <div key={i} className="rounded-lg border border-border bg-card p-3 flex items-start gap-3">
            <span className="text-sm font-mono text-muted-foreground mt-0.5">{i + 1}.</span>
            <div className="flex-1">
              <p className="text-sm font-sans text-foreground">{obj.objective}</p>
            </div>
            <Badge className={`text-[10px] border capitalize shrink-0 ${bloomColors[obj.bloom_level] ?? 'bg-muted'}`}>
              {obj.bloom_level}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LearningObjectivesPanel;
