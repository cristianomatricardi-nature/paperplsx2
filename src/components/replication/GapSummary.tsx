import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface RequirementStatus {
  name: string;
  type: 'instrument' | 'reagent' | 'software' | 'condition';
  paperSpecifies: string;
  labMatch: string | null;
  status: 'available' | 'check' | 'missing';
}

interface GapSummaryProps {
  requirements: RequirementStatus[];
}

export function GapSummary({ requirements }: GapSummaryProps) {
  const total = requirements.length;
  const available = requirements.filter(r => r.status === 'available').length;
  const check = requirements.filter(r => r.status === 'check').length;
  const missing = requirements.filter(r => r.status === 'missing').length;

  const pctAvailable = total > 0 ? (available / total) * 100 : 0;
  const pctCheck = total > 0 ? (check / total) * 100 : 0;

  const missingItems = requirements.filter(r => r.status === 'missing');

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-sans font-semibold">
          {available} of {total} requirements met
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stacked progress bar */}
        <div className="relative h-3 w-full overflow-hidden rounded-full bg-destructive/20">
          <div
            className="absolute left-0 top-0 h-full rounded-l-full"
            style={{
              width: `${pctAvailable + pctCheck}%`,
              background: 'hsl(var(--muted-foreground) / 0.3)',
            }}
          />
          <div
            className="absolute left-0 top-0 h-full rounded-l-full"
            style={{
              width: `${pctAvailable}%`,
              background: 'hsl(142 71% 45%)',
            }}
          />
        </div>

        <div className="flex gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: 'hsl(142 71% 45%)' }} />
            Available ({available})
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: 'hsl(45 93% 47%)' }} />
            Check ({check})
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-destructive" />
            Missing ({missing})
          </span>
        </div>

        {missingItems.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Missing Items</p>
            <ul className="space-y-1">
              {missingItems.map((item, i) => (
                <li key={i} className="flex items-center justify-between text-sm">
                  <span className="text-foreground">{item.name}</span>
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" disabled>
                    <ShoppingCart className="mr-1 h-3 w-3" />
                    Add to list
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
