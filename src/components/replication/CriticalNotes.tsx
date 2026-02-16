import { AlertTriangle } from 'lucide-react';

interface CriticalNotesProps {
  notes: string[];
}

export function CriticalNotes({ notes }: CriticalNotesProps) {
  if (!notes || notes.length === 0) return null;

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Critical Notes</h3>
      <div className="space-y-2">
        {notes.map((note, i) => (
          <div key={i} className="flex gap-2 rounded-lg border border-yellow-300/50 bg-yellow-50 p-3 dark:border-yellow-700/50 dark:bg-yellow-950/30">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" style={{ color: 'hsl(45 93% 47%)' }} />
            <p className="text-sm text-foreground/90 leading-relaxed">{note}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
