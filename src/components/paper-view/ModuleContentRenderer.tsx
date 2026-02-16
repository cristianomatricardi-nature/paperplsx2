import { useMemo } from 'react';
import type { ModuleId } from '@/types/modules';
import type { Figure } from '@/types/structured-paper';
import { MODULE_REGISTRY } from '@/types/modules';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ClaimCard } from './renderers/ClaimCard';
import { ProtocolStep } from './renderers/ProtocolStep';
import { MetricsTable } from './renderers/MetricsTable';
import { MetricsGrid } from './renderers/MetricsGrid';
import { NegativeResultCard } from './renderers/NegativeResultCard';
import { ActionCard } from './renderers/ActionCard';
import { FigurePlaceholder } from './renderers/FigurePlaceholder';
import { GenericFallback } from './renderers/GenericFallback';
import { OverviewBlock } from './renderers/OverviewBlock';
import { EvidenceSummaryCard } from './renderers/EvidenceSummaryCard';
import { ReproducibilityCard } from './renderers/ReproducibilityCard';
import { IntroductionTab } from './renderers/IntroductionTab';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from '@/components/ui/carousel';

interface ModuleContentRendererProps {
  content: unknown;
  moduleId: ModuleId;
  figures?: Figure[];
  paperId?: number;
}

const humanizeKey = (key: string) =>
  key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

/** Check if data matches the M1 overview shape */
function isOverviewData(data: unknown): data is Record<string, unknown> {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) return false;
  const obj = data as Record<string, unknown>;
  return 'context' in obj || 'core_contribution' in obj || 'novelty_statement' in obj;
}

/** Check if data matches the M2 evidence_summary shape */
function isEvidenceSummary(data: unknown): data is Record<string, unknown> {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) return false;
  const obj = data as Record<string, unknown>;
  return 'overall_assessment' in obj || 'total_claims' in obj;
}

/** Check if data matches the M3 reproducibility shape */
function isReproducibilityData(data: unknown): data is Record<string, unknown> {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) return false;
  const obj = data as Record<string, unknown>;
  return 'score' in obj && ('strengths' in obj || 'gaps' in obj);
}

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
function renderBlock(data: unknown, moduleId: ModuleId, figures: Figure[], paperId?: number, sectionKey?: string): React.ReactNode {
  if (data === null || data === undefined) return null;

  // String with figure tokens
  if (typeof data === 'string' && /\[FIGURE:/i.test(data)) {
    return <div className="space-y-2">{replaceFigureTokens(data, figures)}</div>;
  }

  // M1 overview block
  if (moduleId === 'M1' && sectionKey === 'overview' && isOverviewData(data)) {
    return <OverviewBlock data={data as { context?: string; core_contribution?: string; novelty_statement?: string }} />;
  }

  // M2 evidence summary
  if (moduleId === 'M2' && sectionKey === 'evidence_summary' && isEvidenceSummary(data)) {
    return <EvidenceSummaryCard data={data as any} />;
  }

  // M3 reproducibility
  if (moduleId === 'M3' && sectionKey === 'reproducibility' && isReproducibilityData(data)) {
    return <ReproducibilityCard data={data as any} />;
  }

  // M1 impact analysis object with metrics array inside
  if (moduleId === 'M1' && typeof data === 'object' && !Array.isArray(data) && data !== null) {
    const obj = data as Record<string, unknown>;
    if ('metrics' in obj && Array.isArray(obj.metrics)) {
      return (
        <MetricsGrid
          rows={obj.metrics}
          quantitativeHighlights={typeof obj.quantitative_highlights === 'string' ? obj.quantitative_highlights : undefined}
          paperId={paperId}
        />
      );
    }
  }

  // Array rendering with module-specific cards
  if (Array.isArray(data) && data.length > 0) {
    const first = data[0];

    if (moduleId === 'M2' && typeof first === 'object' && first !== null && ('statement' in first || 'strength' in first)) {
      return (
        <div className="px-2">
          <Carousel opts={{ align: 'start', loop: false }} className="w-full">
            <CarouselContent className="-ml-3">
              {data.map((claim, i) => (
                <CarouselItem key={i} className="pl-3 basis-full md:basis-1/2">
                  <ClaimCard claim={claim} />
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="-left-3 md:-left-5" />
            <CarouselNext className="-right-3 md:-right-5" />
          </Carousel>
          <div className="text-center mt-2">
            <span className="text-xs text-muted-foreground">
              {data.length} claims — swipe or use arrows to browse
            </span>
          </div>
        </div>
      );
    }

    if (moduleId === 'M3' && typeof first === 'object' && first !== null && ('title' in first || 'description' in first)) {
      return (
        <div className="space-y-4">
          {data.map((step, i) => <ProtocolStep key={i} step={step} index={i} />)}
        </div>
      );
    }

    if (moduleId === 'M1' && typeof first === 'object' && first !== null && ('metric' in first || 'value' in first)) {
      return <MetricsTable rows={data} />;
    }

    if (moduleId === 'M4' && typeof first === 'object' && first !== null) {
      return (
        <div className="space-y-3">
          {data.map((r, i) => <NegativeResultCard key={i} result={r} />)}
        </div>
      );
    }

    if (moduleId === 'M5' && typeof first === 'object' && first !== null && ('action' in first || 'urgency' in first)) {
      return (
        <div className="space-y-3">
          {data.map((a, i) => <ActionCard key={i} action={a} />)}
        </div>
      );
    }
  }

  return <GenericFallback data={data} />;
}

const ModuleContentRenderer = ({ content, moduleId, figures = [], paperId }: ModuleContentRendererProps) => {
  const contentObj = content as Record<string, unknown> | null;

  // Extract sections from tabs structure
  const { introduction, contentSections } = useMemo(() => {
    if (!contentObj || typeof contentObj !== 'object') return { introduction: null, contentSections: null };
    
    let tabs: Record<string, unknown> | null = null;
    if ('tabs' in contentObj && typeof contentObj.tabs === 'object' && contentObj.tabs !== null) {
      tabs = contentObj.tabs as Record<string, unknown>;
    }
    if (!tabs) return { introduction: null, contentSections: null };

    const { introduction: intro, ...rest } = tabs;
    return {
      introduction: intro as { context_bridge?: string; module_focus?: string; cross_references?: string } | null,
      contentSections: Object.keys(rest).length > 0 ? rest : null,
    };
  }, [contentObj]);

  // Tabbed layout
  if (introduction || contentSections) {
    const sectionKeys = contentSections ? Object.keys(contentSections) : [];

    return (
      <Tabs defaultValue="introduction" className="w-full">
        <TabsList className="w-full flex flex-wrap h-auto gap-1 bg-muted/50">
          {introduction && (
            <TabsTrigger value="introduction" className="text-xs">
              Introduction
            </TabsTrigger>
          )}
          {sectionKeys.map((key) => (
            <TabsTrigger key={key} value={key} className="text-xs">
              {humanizeKey(key)}
            </TabsTrigger>
          ))}
        </TabsList>

        {introduction && (
          <TabsContent value="introduction">
            <IntroductionTab data={introduction} />
          </TabsContent>
        )}

        {sectionKeys.map((key) => {
          const block = renderBlock(contentSections![key], moduleId, figures, paperId, key);
          if (!block) return null;
          return (
            <TabsContent key={key} value={key}>
              {block}
            </TabsContent>
          );
        })}
      </Tabs>
    );
  }

  // Non-tabbed: render directly
  return <div>{renderBlock(content, moduleId, figures, paperId)}</div>;
};

export default ModuleContentRenderer;
