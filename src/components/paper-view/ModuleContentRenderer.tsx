import { useMemo } from 'react';
import type { ModuleId } from '@/types/modules';
import type { Figure } from '@/types/structured-paper';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ClaimCard } from './renderers/ClaimCard';
import { ProtocolStep } from './renderers/ProtocolStep';
import { MetricsTable } from './renderers/MetricsTable';
import { MetricsGrid } from './renderers/MetricsGrid';
import { NegativeResultCard } from './renderers/NegativeResultCard';
import { ActionCard } from './renderers/ActionCard';
import { FigurePlaceholder } from './renderers/FigurePlaceholder';
import { GenericFallback } from './renderers/GenericFallback';

interface ModuleContentRendererProps {
  content: unknown;
  moduleId: ModuleId;
  figures?: Figure[];
}

const humanizeKey = (key: string) =>
  key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

/**
 * Replace [FIGURE: fig_X] tokens in a string with FigurePlaceholder components.
 */
function replaceFigureTokens(text: string, figures: Figure[]): React.ReactNode[] {
  const parts = text.split(/\[FIGURE:\s*(fig_\w+)\]/gi);
  return parts.map((part, i) => {
    if (i % 2 === 1) {
      const fig = figures.find((f) => f.id === part);
      if (fig) return <FigurePlaceholder key={i} figure={fig} />;
      return <span key={i} className="text-xs text-muted-foreground italic">[Figure: {part}]</span>;
    }
    return part ? <span key={i}>{part}</span> : null;
  });
}

/** Render a single content block based on moduleId heuristics */
function renderBlock(data: unknown, moduleId: ModuleId, figures: Figure[]): React.ReactNode {
  if (data === null || data === undefined) return null;

  // String with figure tokens
  if (typeof data === 'string' && /\[FIGURE:/i.test(data)) {
    return <div className="space-y-2">{replaceFigureTokens(data, figures)}</div>;
  }

  // M1 impact analysis object with metrics array inside
  if (moduleId === 'M1' && typeof data === 'object' && !Array.isArray(data) && data !== null) {
    const obj = data as Record<string, unknown>;
    if ('metrics' in obj && Array.isArray(obj.metrics)) {
      return (
        <MetricsGrid
          rows={obj.metrics}
          quantitativeHighlights={typeof obj.quantitative_highlights === 'string' ? obj.quantitative_highlights : undefined}
        />
      );
    }
  }

  // Array rendering with module-specific cards
  if (Array.isArray(data) && data.length > 0) {
    const first = data[0];

    // M2 claims
    if (moduleId === 'M2' && typeof first === 'object' && first !== null && ('statement' in first || 'strength' in first)) {
      return (
        <div className="space-y-3">
          {data.map((claim, i) => <ClaimCard key={i} claim={claim} />)}
        </div>
      );
    }

    // M3 protocol steps
    if (moduleId === 'M3' && typeof first === 'object' && first !== null && ('title' in first || 'description' in first)) {
      return (
        <div className="space-y-4">
          {data.map((step, i) => <ProtocolStep key={i} step={step} index={i} />)}
        </div>
      );
    }

    // M1 metrics table (array of objects with metric/value)
    if (moduleId === 'M1' && typeof first === 'object' && first !== null && ('metric' in first || 'value' in first)) {
      return <MetricsTable rows={data} />;
    }

    // M4 negative results
    if (moduleId === 'M4' && typeof first === 'object' && first !== null) {
      return (
        <div className="space-y-3">
          {data.map((r, i) => <NegativeResultCard key={i} result={r} />)}
        </div>
      );
    }

    // M5 actions
    if (moduleId === 'M5' && typeof first === 'object' && first !== null && ('action' in first || 'urgency' in first)) {
      return (
        <div className="space-y-3">
          {data.map((a, i) => <ActionCard key={i} action={a} />)}
        </div>
      );
    }
  }

  // Fallback for any content
  return <GenericFallback data={data} />;
}

const ModuleContentRenderer = ({ content, moduleId, figures = [] }: ModuleContentRendererProps) => {
  const contentObj = content as Record<string, unknown> | null;

  // Check for tabbed structure
  const tabs = useMemo(() => {
    if (!contentObj || typeof contentObj !== 'object') return null;
    if ('tabs' in contentObj && typeof contentObj.tabs === 'object' && contentObj.tabs !== null) {
      return contentObj.tabs as Record<string, unknown>;
    }
    return null;
  }, [contentObj]);

  // Tabbed rendering
  if (tabs) {
    const tabKeys = Object.keys(tabs);
    if (tabKeys.length === 0) return null;

    return (
      <Tabs defaultValue={tabKeys[0]} className="w-full">
        <TabsList className="w-full flex-wrap h-auto gap-1 bg-muted/50 p-1">
          {tabKeys.map((key) => (
            <TabsTrigger key={key} value={key} className="text-xs">
              {humanizeKey(key)}
            </TabsTrigger>
          ))}
        </TabsList>
        {tabKeys.map((key) => (
          <TabsContent key={key} value={key} className="mt-3">
            {renderBlock(tabs[key], moduleId, figures)}
          </TabsContent>
        ))}
      </Tabs>
    );
  }

  // Non-tabbed: render directly
  return <div>{renderBlock(content, moduleId, figures)}</div>;
};

export default ModuleContentRenderer;
