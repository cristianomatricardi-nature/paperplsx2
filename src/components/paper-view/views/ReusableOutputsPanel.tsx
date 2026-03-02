import { Badge } from '@/components/ui/badge';
import { Database, Code2, FlaskConical, Package, ExternalLink } from 'lucide-react';
import type { FunderOutput } from '@/hooks/useFunderView';

interface ReusableOutputsPanelProps {
  outputs: {
    data: FunderOutput[];
    code: FunderOutput[];
    protocols: FunderOutput[];
    materials: FunderOutput[];
  };
}

const categoryConfig = [
  { key: 'data' as const, label: 'Datasets', icon: Database },
  { key: 'code' as const, label: 'Code', icon: Code2 },
  { key: 'protocols' as const, label: 'Protocols', icon: FlaskConical },
  { key: 'materials' as const, label: 'Materials', icon: Package },
];

const accessColors: Record<string, string> = {
  open: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  restricted: 'bg-amber-100 text-amber-800 border-amber-200',
  unavailable: 'bg-red-100 text-red-800 border-red-200',
};

const ReusableOutputsPanel = ({ outputs }: ReusableOutputsPanelProps) => {
  const hasAnyOutputs = categoryConfig.some((c) => (outputs[c.key]?.length ?? 0) > 0);
  if (!hasAnyOutputs) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {categoryConfig.map(({ key, label, icon: Icon }) => {
        const items = outputs[key] ?? [];
        if (items.length === 0) return null;

        return (
          <div key={key} className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              <Icon className="h-3.5 w-3.5" />
              {label}
            </div>
            {items.map((item, i) => (
              <div key={i} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm font-sans text-foreground truncate">{item.name}</span>
                  {item.link && (
                    <a href={item.link} target="_blank" rel="noopener noreferrer" className="shrink-0">
                      <ExternalLink className="h-3 w-3 text-primary" />
                    </a>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[10px] text-muted-foreground">{item.license}</span>
                  <Badge className={`text-[10px] border capitalize ${accessColors[item.access] ?? accessColors.unavailable}`}>
                    {item.access}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
};

export default ReusableOutputsPanel;
