import { Badge } from '@/components/ui/badge';
import { ArrowRight } from 'lucide-react';
import type { FunderNextStep } from '@/hooks/useFunderView';

interface NextStepsGatesProps {
  nextSteps: FunderNextStep[];
  limitations: string[];
}

const scaleColors: Record<string, string> = {
  pilot: 'bg-blue-50 text-blue-700 border-blue-200',
  lab: 'bg-violet-50 text-violet-700 border-violet-200',
  field: 'bg-amber-50 text-amber-700 border-amber-200',
  population: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

const NextStepsGates = ({ nextSteps, limitations }: NextStepsGatesProps) => {
  return (
    <div className="space-y-4">
      {/* Next steps */}
      {nextSteps && nextSteps.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold font-sans text-foreground mb-3 uppercase tracking-wide">
            Next Steps & Gates
          </h3>
          <div className="space-y-2">
            {nextSteps.map((ns, i) => (
              <div key={i} className="rounded-lg border border-border bg-card p-3 flex items-start gap-3">
                <ArrowRight className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-sans font-medium text-foreground">{ns.step}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {ns.gating_evidence && <span>Gate: {ns.gating_evidence}</span>}
                    {ns.dependency && <span>Depends on: {ns.dependency}</span>}
                  </div>
                </div>
                {ns.scale_hint && (
                  <Badge className={`text-[10px] border shrink-0 capitalize ${scaleColors[ns.scale_hint] ?? 'bg-muted text-foreground'}`}>
                    {ns.scale_hint}
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Limitations */}
      {limitations && limitations.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold font-sans text-foreground mb-2 uppercase tracking-wide">
            Limitations
          </h3>
          <ul className="list-disc pl-5 space-y-1">
            {limitations.map((lim, i) => (
              <li key={i} className="text-sm text-muted-foreground font-sans">{lim}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default NextStepsGates;
