import { renderWithPageRefs } from './PageReference';

interface OverviewData {
  context?: string;
  core_contribution?: string;
  novelty_statement?: string;
  [key: string]: unknown;
}

interface OverviewBlockProps {
  data: OverviewData;
}

export function OverviewBlock({ data }: OverviewBlockProps) {
  const { context, core_contribution, novelty_statement } = data;

  return (
    <div className="space-y-4">
      {context && (
        <p className="text-base text-foreground/90 leading-relaxed">
          {renderWithPageRefs(context)}
        </p>
      )}
      {core_contribution && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-primary/70 mb-1.5">
            Core Contribution
          </p>
          <p className="text-base font-medium text-foreground leading-relaxed">
            {renderWithPageRefs(core_contribution)}
          </p>
        </div>
      )}
      {novelty_statement && (
        <p className="text-base italic text-foreground/75 leading-relaxed">
          {renderWithPageRefs(novelty_statement)}
        </p>
      )}
    </div>
  );
}
