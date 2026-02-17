import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Users, Repeat, ListChecks, Settings } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { MethodStep } from '@/types/structured-paper';
import type { RequirementStatus } from '@/components/replication/GapSummary';

interface AgenticPlanningPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  methods: MethodStep[];
  requirements: RequirementStatus[];
  inventory: { item_name: string; item_type: string; model_number: string | null }[];
  paperField: string | null;
}

interface PlanningResult {
  resource_groups: { name: string; type: string; contact_hint: string }[];
  approximations: { missing: string; substitute: string; fidelity: number; note: string }[];
  step_by_step: string;
  instrument_setup: string[];
}

export function AgenticPlanningPanel({ open, onOpenChange, methods, requirements, inventory, paperField }: AgenticPlanningPanelProps) {
  const [result, setResult] = useState<PlanningResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRun = async () => {
    setLoading(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('agentic-planning', {
        body: {
          methods,
          requirements,
          inventory,
          field: paperField,
        },
      });
      if (error) throw error;
      setResult(data as PlanningResult);
    } catch (e: any) {
      console.error(e);
      toast({ title: 'Planning failed', description: e.message ?? 'Try again.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif">AI Agentic Planning</DialogTitle>
          <DialogDescription>
            Optimize your resources by finding alternatives, approximations, and external groups that can help.
          </DialogDescription>
        </DialogHeader>

        {!result && !loading && (
          <div className="text-center py-8 space-y-4">
            <p className="text-sm text-muted-foreground">
              The AI will analyze {requirements.filter(r => r.status === 'missing').length} missing items
              and suggest optimizations based on your {inventory.length} lab items.
            </p>
            <Button onClick={handleRun} className="gap-1.5">
              Run Agentic Planning
            </Button>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Analyzing resources and finding alternatives…</p>
          </div>
        )}

        {result && (
          <div className="space-y-4">
            {/* Resource Groups */}
            {result.resource_groups?.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-1.5">
                    <Users className="h-4 w-4" /> External Resource Groups
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {result.resource_groups.map((g, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <Badge variant="outline" className="text-[10px] shrink-0">{g.type}</Badge>
                      <div>
                        <p className="font-medium text-foreground">{g.name}</p>
                        <p className="text-xs text-muted-foreground">{g.contact_hint}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Approximations */}
            {result.approximations?.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-1.5">
                    <Repeat className="h-4 w-4" /> Approximation Suggestions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {result.approximations.map((a, i) => (
                    <div key={i} className="rounded-md border border-border p-2.5 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground">{a.missing} → {a.substitute}</span>
                        <Badge variant={a.fidelity >= 80 ? 'default' : 'secondary'} className="text-[10px]">
                          {a.fidelity}% fidelity
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{a.note}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Step-by-step guide */}
            {result.step_by_step && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-1.5">
                    <ListChecks className="h-4 w-4" /> Step-by-Step Replication Guide
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                    {result.step_by_step}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Instrument setup */}
            {result.instrument_setup?.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-1.5">
                    <Settings className="h-4 w-4" /> Instrument Setup
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1">
                    {result.instrument_setup.map((s, i) => (
                      <li key={i} className="text-sm text-foreground flex items-start gap-2">
                        <span className="text-muted-foreground shrink-0">{i + 1}.</span>
                        {s}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
