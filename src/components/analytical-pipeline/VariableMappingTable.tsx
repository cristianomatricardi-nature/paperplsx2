import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

export interface PipelineVariable {
  name: string;
  role: string;
  description: string;
  paper_definition: string;
}

const ROLE_COLORS: Record<string, string> = {
  independent: 'bg-blue-500/15 text-blue-700 dark:text-blue-300',
  dependent: 'bg-rose-500/15 text-rose-700 dark:text-rose-300',
  covariate: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  confounder: 'bg-violet-500/15 text-violet-700 dark:text-violet-300',
};

const ROLE_SHORT: Record<string, string> = {
  independent: 'IV',
  dependent: 'DV',
  covariate: 'Cov',
  confounder: 'Conf',
};

interface VariableMappingTableProps {
  variables: PipelineVariable[];
  mappings: Record<string, string>;
  onMappingChange: (variableName: string, userVariable: string) => void;
}

export function VariableMappingTable({ variables, mappings, onMappingChange }: VariableMappingTableProps) {
  if (variables.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4 font-sans">
        No variables extracted yet.
      </p>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="grid grid-cols-[1fr_1fr] text-xs font-semibold font-sans text-muted-foreground border-b border-border">
        <div className="px-4 py-2.5">Paper Variable</div>
        <div className="px-4 py-2.5">Your Variable</div>
      </div>
      {variables.map((v) => (
        <div key={v.name} className="grid grid-cols-[1fr_1fr] border-b border-border last:border-b-0 items-center">
          <div className="px-4 py-2.5 flex items-center gap-2">
            <Badge variant="outline" className={`text-[9px] px-1 py-0 ${ROLE_COLORS[v.role] ?? ''}`}>
              {ROLE_SHORT[v.role] ?? v.role}
            </Badge>
            <span className="text-xs font-mono text-foreground">{v.name}</span>
          </div>
          <div className="px-4 py-1.5">
            <Input
              value={mappings[v.name] ?? ''}
              onChange={(e) => onMappingChange(v.name, e.target.value)}
              placeholder={`your_${v.name.toLowerCase().replace(/\s+/g, '_')}`}
              className="h-7 text-xs font-mono"
            />
          </div>
        </div>
      ))}
    </div>
  );
}
