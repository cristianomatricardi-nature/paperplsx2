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
}

export function ProtocolStep({ step, index }: { step: StepData; index: number }) {
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
          {step.tools?.map((t, i) => (
            <span key={`tool-${i}`} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
              🔧 {t}
            </span>
          ))}
          {step.reagents?.map((r, i) => (
            <span key={`reagent-${i}`} className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">
              🧪 {r}
            </span>
          ))}
          {step.software?.map((s, i) => (
            <span key={`sw-${i}`} className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">
              💻 {s}
            </span>
          ))}
        </div>

        {/* Conditions */}
        {step.conditions && step.conditions.length > 0 && (
          <p className="text-xs italic text-muted-foreground">
            {step.conditions.join(' · ')}
          </p>
        )}

        {/* Duration badge */}
        {step.duration && (
          <span className="inline-block text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-sm font-mono">
            ⏱ {step.duration}
          </span>
        )}

        {/* Critical notes */}
        {step.critical_notes && step.critical_notes.length > 0 && (
          <div className="rounded-md bg-yellow-50 border border-yellow-200 p-2.5 space-y-1">
            {step.critical_notes.map((note, i) => (
              <p key={i} className="text-xs text-yellow-800">⚠️ {note}</p>
            ))}
          </div>
        )}

        {/* Page refs */}
        {step.page_numbers && step.page_numbers.length > 0 && (
          <div className="flex gap-1">
            {step.page_numbers.map((p) => (
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
