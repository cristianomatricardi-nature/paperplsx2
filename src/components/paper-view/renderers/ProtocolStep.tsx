interface StepData {
  title?: string;
  description?: string;
  tools?: string[];
  reagents?: string[];
  software?: string[];
  conditions?: string[];
  duration?: string | null;
  critical_notes?: string[];
  page_numbers?: number[];
  page_refs?: number[];
}

const toArray = (val: unknown): string[] =>
  Array.isArray(val) ? val : typeof val === 'string' ? [val] : [];

export function ProtocolStep({ step, index }: { step: StepData; index: number }) {
  const pages = toArray(step.page_numbers ?? step.page_refs).map(Number).filter(Boolean);
  const tools = toArray(step.tools);
  const reagents = toArray(step.reagents);
  const software = toArray(step.software);
  const conditions = toArray(step.conditions);
  const criticalNotes = toArray(step.critical_notes);

  return (
    <div className="flex gap-3">
      {/* Numbered circle */}
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-accent text-accent-foreground flex items-center justify-center text-xs font-semibold mt-0.5">
        {index + 1}
      </div>

      <div className="flex-1 space-y-2">
        <p className="text-sm font-semibold text-foreground">{step.title}</p>

        {step.description && (
          <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
        )}

        {/* Chip rows */}
        <div className="flex flex-wrap gap-1.5">
          {tools.map((t, i) => (
            <span key={`tool-${i}`} className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">
              🔧 {t}
            </span>
          ))}
          {reagents.map((r, i) => (
            <span key={`reagent-${i}`} className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">
              🧪 {r}
            </span>
          ))}
          {software.map((s, i) => (
            <span key={`sw-${i}`} className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">
              💻 {s}
            </span>
          ))}
        </div>

        {/* Conditions */}
        {conditions.length > 0 && (
          <p className="text-xs italic text-muted-foreground">
            {conditions.join(' · ')}
          </p>
        )}

        {/* Duration badge */}
        {step.duration && (
          <span className="inline-block text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-sm font-mono">
            ⏱ {step.duration}
          </span>
        )}

        {/* Critical notes */}
        {criticalNotes.length > 0 && (
          <div className="rounded-md bg-muted border border-border p-2.5 space-y-1">
            {criticalNotes.map((note, i) => (
              <p key={i} className="text-xs text-muted-foreground">⚠️ {note}</p>
            ))}
          </div>
        )}

        {/* Page refs */}
        {pages.length > 0 && (
          <div className="flex gap-1">
            {pages.map((p) => (
              <span key={p} className="text-xs font-mono text-accent hover:underline cursor-pointer">
                (p.&nbsp;{p})
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
