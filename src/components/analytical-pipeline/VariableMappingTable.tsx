import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Upload, Info } from 'lucide-react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

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
  scatterData?: { x: number; y: number; label?: string }[];
}

export function VariableMappingTable({ variables, mappings, onMappingChange, scatterData }: VariableMappingTableProps) {
  if (variables.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4 font-sans">
        No variables extracted yet.
      </p>
    );
  }

  // Derive axis labels from first IV and DV
  const ivVar = variables.find((v) => v.role === 'independent');
  const dvVar = variables.find((v) => v.role === 'dependent');
  const xLabel = ivVar?.name ?? 'Variable 1';
  const yLabel = dvVar?.name ?? 'Variable 2';

  const plotData = scatterData && scatterData.length > 0
    ? scatterData
    : Array.from({ length: 20 }, (_, i) => ({
        x: +(Math.random() * 10).toFixed(2),
        y: +(Math.random() * 10).toFixed(2),
      }));

  return (
    <div className="space-y-4">
      {/* Mocked scatter plot */}
      <div className="rounded-xl border border-border bg-card shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-semibold font-sans text-foreground">
            {xLabel} vs {yLabel}
          </h4>
          <Badge variant="outline" className="text-[9px] gap-1 text-muted-foreground">
            <Info className="h-2.5 w-2.5" />
            Mocked data
          </Badge>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <ScatterChart margin={{ top: 5, right: 10, bottom: 20, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis
              dataKey="x"
              type="number"
              name={xLabel}
              tick={{ fontSize: 10 }}
              label={{ value: xLabel, position: 'insideBottom', offset: -10, fontSize: 10, className: 'fill-muted-foreground' }}
              className="text-muted-foreground"
            />
            <YAxis
              dataKey="y"
              type="number"
              name={yLabel}
              tick={{ fontSize: 10 }}
              label={{ value: yLabel, angle: -90, position: 'insideLeft', fontSize: 10, className: 'fill-muted-foreground' }}
              className="text-muted-foreground"
            />
            <Tooltip
              cursor={{ strokeDasharray: '3 3' }}
              contentStyle={{ fontSize: 11, borderRadius: 8 }}
            />
            <Scatter data={plotData} fill="hsl(var(--primary))" fillOpacity={0.6} r={4} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* Variable table */}
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

      {/* Upload placeholder */}
      <div className="rounded-xl border-2 border-dashed border-border bg-muted/20 p-6 text-center opacity-60 cursor-not-allowed">
        <Upload className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
        <p className="text-xs font-sans text-muted-foreground font-medium">
          Upload Your Dataset (CSV)
        </p>
        <p className="text-[10px] font-sans text-muted-foreground mt-1">
          Drag & drop or click to upload — <span className="font-semibold">coming soon</span>
        </p>
      </div>
    </div>
  );
}
