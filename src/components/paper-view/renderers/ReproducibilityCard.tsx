import { Progress } from '@/components/ui/progress';
import { renderWithPageRefs } from './PageReference';

interface ReproducibilityData {
  score?: number;
  strengths?: string[];
  gaps?: string[];
  pitfalls?: string[];
  [key: string]: unknown;
}

interface ReproducibilityCardProps {
  data: ReproducibilityData;
  moduleId?: string;
}

function BulletList({ label, items }: { label: string; items: string[] }) {
  if (!items || items.length === 0) return null;
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">{label}</p>
      <ul className="list-disc list-inside space-y-1">
        {items.map((item, i) => (
          <li key={i} className="text-sm text-foreground/90 leading-relaxed">
            {renderWithPageRefs(item)}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ReproducibilityCard({ data, moduleId }: ReproducibilityCardProps) {
  const { score, strengths, gaps, pitfalls } = data;

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('application/json', JSON.stringify({
          sourceModule: moduleId ?? 'M3',
          type: 'reproducibility',
          title: `Reproducibility: ${score ?? '?'}/10`,
          data,
        }));
        e.dataTransfer.effectAllowed = 'copy';
      }}
      className="space-y-4 cursor-grab active:cursor-grabbing"
    >
      {score != null && (
        <div className="flex items-center gap-4">
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold text-foreground">{score}</span>
            <span className="text-sm text-muted-foreground">/10</span>
          </div>
          <Progress value={score * 10} className="flex-1 h-2.5" />
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <BulletList label="Strengths" items={strengths ?? []} />
        <BulletList label="Gaps" items={gaps ?? []} />
      </div>
      <BulletList label="Pitfalls" items={pitfalls ?? []} />
    </div>
  );
}
