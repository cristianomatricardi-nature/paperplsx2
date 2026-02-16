import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import type { RequirementStatus } from './GapSummary';

const TYPE_COLORS: Record<string, string> = {
  instrument: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  reagent: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  software: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
  condition: 'bg-secondary text-secondary-foreground',
};

function StatusIcon({ status }: { status: RequirementStatus['status'] }) {
  switch (status) {
    case 'available':
      return <span className="flex items-center gap-1 text-xs font-medium" style={{ color: 'hsl(142 71% 45%)' }}><CheckCircle2 className="h-4 w-4" /> Available</span>;
    case 'check':
      return <span className="flex items-center gap-1 text-xs font-medium" style={{ color: 'hsl(45 93% 47%)' }}><AlertTriangle className="h-4 w-4" /> Check</span>;
    case 'missing':
      return <span className="flex items-center gap-1 text-xs font-medium text-destructive"><XCircle className="h-4 w-4" /> Missing</span>;
  }
}

interface RequirementsComparisonProps {
  requirements: RequirementStatus[];
}

export function RequirementsComparison({ requirements }: RequirementsComparisonProps) {
  if (requirements.length === 0) {
    return <p className="text-sm text-muted-foreground py-4">No specific requirements listed for this method.</p>;
  }

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="text-xs font-semibold uppercase">Requirement</TableHead>
            <TableHead className="text-xs font-semibold uppercase">Type</TableHead>
            <TableHead className="text-xs font-semibold uppercase">Paper Specifies</TableHead>
            <TableHead className="text-xs font-semibold uppercase">Your Lab</TableHead>
            <TableHead className="text-xs font-semibold uppercase">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {requirements.map((req, i) => (
            <TableRow key={i} className={i % 2 === 0 ? '' : 'bg-muted/30'}>
              <TableCell className="font-medium text-sm">{req.name}</TableCell>
              <TableCell>
                <Badge variant="secondary" className={`text-[10px] ${TYPE_COLORS[req.type] ?? ''}`}>
                  {req.type}
                </Badge>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">{req.paperSpecifies}</TableCell>
              <TableCell className="text-sm">{req.labMatch ?? '—'}</TableCell>
              <TableCell><StatusIcon status={req.status} /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
