import { Badge } from '@/components/ui/badge';
import { Beaker, Clock, Package } from 'lucide-react';
import type { ClassroomActivity } from '@/hooks/useEducatorView';

interface ClassroomActivitiesProps {
  activities: ClassroomActivity[];
}

const ClassroomActivities = ({ activities }: ClassroomActivitiesProps) => {
  if (!activities || activities.length === 0) return null;

  return (
    <div>
      <h3 className="text-sm font-semibold font-sans text-foreground mb-3 uppercase tracking-wide flex items-center gap-2">
        <Beaker className="h-4 w-4" />
        Classroom Activities
      </h3>
      <div className="space-y-3">
        {activities.map((act, i) => (
          <div key={i} className="rounded-lg border border-border bg-card p-4 space-y-2">
            <div className="flex items-start justify-between gap-3">
              <h4 className="text-sm font-sans font-semibold text-foreground">{act.title}</h4>
              <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                <Clock className="h-3 w-3" />
                {act.duration}
              </div>
            </div>
            <p className="text-xs text-muted-foreground font-sans leading-relaxed">{act.description}</p>

            {act.materials && act.materials.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <Package className="h-3 w-3 text-muted-foreground" />
                {act.materials.map((m, j) => (
                  <Badge key={j} variant="outline" className="text-[10px]">{m}</Badge>
                ))}
              </div>
            )}

            <div className="text-xs text-primary font-sans">
              <span className="font-semibold">Outcome:</span> {act.learning_outcome}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ClassroomActivities;
