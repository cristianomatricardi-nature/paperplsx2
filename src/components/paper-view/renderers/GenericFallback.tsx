import { renderWithPageRefs } from './PageReference';

interface GenericFallbackProps {
  data: unknown;
}

export function GenericFallback({ data }: GenericFallbackProps) {
  if (data === null || data === undefined) return null;

  // String → paragraph with page ref detection
  if (typeof data === 'string') {
    return <p className="text-base text-foreground/90 leading-relaxed">{renderWithPageRefs(data)}</p>;
  }

  // Number / boolean
  if (typeof data !== 'object') {
    return <p className="text-base text-foreground/90">{String(data)}</p>;
  }

  // Array
  if (Array.isArray(data)) {
    // Array of strings → bullet list
    if (data.length > 0 && typeof data[0] === 'string') {
      return (
        <ul className="list-disc list-inside space-y-1">
          {data.map((item, i) => (
            <li key={i} className="text-base text-foreground/90">{renderWithPageRefs(item)}</li>
          ))}
        </ul>
      );
    }

    // Array of objects → cards
    return (
      <div className="space-y-3">
        {data.map((item, i) => (
          <div key={i} className="rounded-md border border-border bg-card p-3">
            <GenericFallback data={item} />
          </div>
        ))}
      </div>
    );
  }

  // Object → recursive key/value
  const obj = data as Record<string, unknown>;
  const humanize = (key: string) =>
    key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="space-y-2">
      {Object.entries(obj).map(([key, value]) => (
        <div key={key}>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">
            {humanize(key)}
          </p>
          <GenericFallback data={value} />
        </div>
      ))}
    </div>
  );
}
