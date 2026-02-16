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

export function ReproducibilityCard({ data }: ReproducibilityCardProps) {
  const { score, strengths, gaps, pitfalls } = data;

  return (
    <div className="space-y-4">
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
