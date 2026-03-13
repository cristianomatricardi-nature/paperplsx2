import PersonalizedSummaryCard from '@/components/paper-view/PersonalizedSummaryCard';
import ModuleAccordionList from '@/components/paper-view/ModuleAccordionList';
import FiguresSection from '@/components/paper-view/FiguresSection';
import type { SubPersonaId, ModuleId } from '@/types/modules';
import type { AuthorEnrichments } from '@/components/paper-view/AuthorEnrichmentPanel';
import type { StructuredPaper } from '@/types/structured-paper';

interface ResearcherViewProps {
  paperId: number;
  subPersonaId: SubPersonaId;
  moduleOrder: ModuleId[];
  structured: StructuredPaper | null;
  storagePath: string | null;
  authorsMode: boolean;
  authorEnrichments: AuthorEnrichments;
  onEnrichmentsUpdate: (e: AuthorEnrichments) => void;
  onPersonaChange: (persona: SubPersonaId) => void;
  onModuleOpened: (moduleId: ModuleId) => void;
  allowedPersonas?: SubPersonaId[];
  moduleTitles?: Record<string, string>;
}

/**
 * ResearcherView — the canonical module accordion layout.
 * Extracted from PaperViewPage. Zero behavior change.
 */
const ResearcherView = ({
  paperId,
  subPersonaId,
  moduleOrder,
  structured,
  storagePath,
  authorsMode,
  authorEnrichments,
  onEnrichmentsUpdate,
  onPersonaChange,
  onModuleOpened,
  allowedPersonas,
  moduleTitles = {},
}: ResearcherViewProps) => {
  return (
    <>
      <div className="mb-6">
        <PersonalizedSummaryCard
          paperId={paperId}
          subPersonaId={subPersonaId}
          onPersonaChange={onPersonaChange}
          allowedPersonas={allowedPersonas}
        />
      </div>

      <ModuleAccordionList
        paperId={paperId}
        subPersonaId={subPersonaId}
        moduleOrder={moduleOrder}
        figures={structured?.figures}
        authorsMode={authorsMode}
        authorEnrichments={authorEnrichments}
        onEnrichmentsUpdate={onEnrichmentsUpdate}
        onModuleOpened={onModuleOpened}
        moduleTitles={moduleTitles}
      />

      {structured?.figures && structured.figures.length > 0 && (
        <div className="mt-6">
          <FiguresSection figures={structured.figures} paperId={paperId} />
        </div>
      )}
    </>
  );
};

export default ResearcherView;
