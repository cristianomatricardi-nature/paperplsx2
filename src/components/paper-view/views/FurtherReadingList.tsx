import { Badge } from '@/components/ui/badge';
import { BookMarked, ExternalLink, Video, Globe, BookOpen, Monitor } from 'lucide-react';
import type { FurtherReading } from '@/hooks/useEducatorView';

interface FurtherReadingListProps {
  readings: FurtherReading[];
}

const typeIcons: Record<string, React.ReactNode> = {
  article: <BookOpen className="h-3.5 w-3.5" />,
  video: <Video className="h-3.5 w-3.5" />,
  simulation: <Monitor className="h-3.5 w-3.5" />,
  textbook: <BookMarked className="h-3.5 w-3.5" />,
  website: <Globe className="h-3.5 w-3.5" />,
};

const levelColors: Record<string, string> = {
  beginner: 'bg-green-100 text-green-700 border-green-200',
  intermediate: 'bg-amber-100 text-amber-700 border-amber-200',
  advanced: 'bg-red-100 text-red-700 border-red-200',
};

const FurtherReadingList = ({ readings }: FurtherReadingListProps) => {
  if (!readings || readings.length === 0) return null;

  return (
    <div>
      <h3 className="text-sm font-semibold font-sans text-foreground mb-3 uppercase tracking-wide flex items-center gap-2">
        <BookMarked className="h-4 w-4" />
        Further Reading
      </h3>
      <div className="space-y-2">
        {readings.map((r, i) => {
          const isUrl = r.url_or_description?.startsWith('http');

          return (
            <div key={i} className="rounded-lg border border-border bg-card p-3 flex items-start gap-3">
              <span className="mt-0.5 text-muted-foreground">{typeIcons[r.type] ?? <Globe className="h-3.5 w-3.5" />}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-sans text-foreground truncate">{r.title}</p>
                  {isUrl && (
                    <a href={r.url_or_description} target="_blank" rel="noopener noreferrer" className="shrink-0">
                      <ExternalLink className="h-3 w-3 text-primary" />
                    </a>
                  )}
                </div>
                {!isUrl && r.url_or_description && (
                  <p className="text-xs text-muted-foreground truncate">{r.url_or_description}</p>
                )}
              </div>
              <Badge className={`text-[10px] border capitalize shrink-0 ${levelColors[r.level] ?? 'bg-muted'}`}>
                {r.level}
              </Badge>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FurtherReadingList;
