import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  if ((!nextSteps || nextSteps.length === 0) && (!limitations || limitations.length === 0)) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold uppercase tracking-wide">
          Next Steps & Gates
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {nextSteps && nextSteps.length > 0 && (
          <div className="relative space-y-0">
            {nextSteps.map((ns, i) => (
              <div key={i} className="flex gap-3 pb-4 last:pb-0">
                {/* Connecting line */}
                <div className="flex flex-col items-center">
                  <div className="h-2.5 w-2.5 rounded-full bg-primary shrink-0 mt-1.5" />
                  {i < nextSteps.length - 1 && <div className="w-px flex-1 bg-border" />}
                </div>
                <div className="flex-1 space-y-1 pb-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-sans font-medium text-foreground">{ns.step}</p>
                    {ns.scale_hint && (
                      <Badge className={`text-[10px] border shrink-0 capitalize ${scaleColors[ns.scale_hint] ?? 'bg-muted text-foreground'}`}>
                        {ns.scale_hint}
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {ns.gating_evidence && <span>Gate: {ns.gating_evidence}</span>}
                    {ns.dependency && <span>Depends on: {ns.dependency}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {limitations && limitations.length > 0 && (
          <div className="border-t border-border pt-3">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Limitations
            </h4>
            <ul className="list-disc pl-5 space-y-1">
              {limitations.map((lim, i) => (
                <li key={i} className="text-sm text-muted-foreground font-sans">{lim}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default NextStepsGates;
