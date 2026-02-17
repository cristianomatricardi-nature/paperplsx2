interface NegativeResultData {
  description?: string;
  hypothesis_tested?: string;
  what_was_tested?: string;
  what_happened?: string;
  why_it_matters?: string;
  page_numbers?: number[];
  page_refs?: number[];
}

export function NegativeResultCard({ result, moduleId }: { result: NegativeResultData; moduleId?: string }) {
  const tested = result.hypothesis_tested ?? result.what_was_tested ?? '';
  const happened = result.description ?? result.what_happened ?? '';
  const matters = result.why_it_matters ?? '';
  const pages = result.page_numbers ?? result.page_refs ?? [];

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('application/json', JSON.stringify({
          sourceModule: moduleId ?? 'M4',
          type: 'negative_result',
          title: tested || happened || 'Negative Result',
          data: result,
        }));
        e.dataTransfer.effectAllowed = 'copy';
      }}
      className="rounded-md border border-border bg-card p-4 border-l-4 border-l-destructive/60 space-y-2 cursor-grab active:cursor-grabbing"
    >
      {tested && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">What was tested</p>
          <p className="text-sm text-foreground">{tested}</p>
        </div>
      )}
      {happened && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">What happened</p>
          <p className="text-sm text-foreground">{happened}</p>
        </div>
      )}
      {matters && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Why it matters</p>
          <p className="text-sm text-foreground">{matters}</p>
        </div>
      )}
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
  );
}
