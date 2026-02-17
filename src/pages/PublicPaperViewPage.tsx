import { useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { MODULE_ORDER_BY_PERSONA } from '@/lib/constants';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { PanelRightClose, PanelRightOpen } from 'lucide-react';
import PaperHeader from '@/components/paper-view/PaperHeader';
import PersonalizedSummaryCard from '@/components/paper-view/PersonalizedSummaryCard';
import ModuleAccordionList from '@/components/paper-view/ModuleAccordionList';
import FiguresSection from '@/components/paper-view/FiguresSection';
import PaperSidebar from '@/components/paper-view/PaperSidebar';
import type { SubPersonaId, ModuleId } from '@/types/modules';
import type { Author } from '@/types/database';
import type { StructuredPaper } from '@/types/structured-paper';

const PublicPaperViewPage = () => {
  const { paperId } = useParams();
  const [searchParams] = useSearchParams();
  const isEmbed = searchParams.get('embed') === 'true';
  const numericId = paperId ? Number(paperId) : null;

  const [paper, setPaper] = useState<Record<string, unknown> | null>(null);
  const [structured, setStructured] = useState<StructuredPaper | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [subPersonaId, setSubPersonaId] = useState<SubPersonaId>('phd_postdoc');
  const [moduleOrder, setModuleOrder] = useState<ModuleId[]>(MODULE_ORDER_BY_PERSONA['phd_postdoc']);
  const [sidebarOpen, setSidebarOpen] = useState(!isEmbed);
  const [allowedPersonas, setAllowedPersonas] = useState<SubPersonaId[] | undefined>(undefined);

  useEffect(() => {
    if (!numericId) return;

    const load = async () => {
      setLoading(true);
      const [paperRes, structuredRes] = await Promise.all([
        supabase.from('papers').select('*').eq('id', numericId).single(),
        supabase.from('structured_papers').select('*').eq('paper_id', numericId).single(),
      ]);

      if (!paperRes.data || (paperRes.data as any).status !== 'completed') {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setPaper(paperRes.data as Record<string, unknown>);
      const sp = (paperRes.data as any).selected_personas as SubPersonaId[] | null;
      if (sp && sp.length > 0) {
        setAllowedPersonas(sp);
        if (!sp.includes(subPersonaId)) {
          setSubPersonaId(sp[0]);
          setModuleOrder(MODULE_ORDER_BY_PERSONA[sp[0]]);
        }
      }
      if (structuredRes.data) {
        setStructured(structuredRes.data as unknown as StructuredPaper);
      }
      setLoading(false);
    };

    load();
  }, [numericId]);

  const handlePersonaChange = useCallback((newPersona: SubPersonaId) => {
    setSubPersonaId(newPersona);
    setModuleOrder(MODULE_ORDER_BY_PERSONA[newPersona]);
  }, []);

  const title = (paper?.title as string) ?? null;
  const authors = (paper?.authors as Author[] | null) ?? null;
  const journal = (paper?.journal as string) ?? null;
  const publicationDate = (paper?.publication_date as string) ?? null;
  const doi = (paper?.doi as string) ?? null;
  const storagePath = (paper?.storage_path as string) ?? null;

  if (loading) {
    return (
      <div className={cn('min-h-screen bg-background', isEmbed ? 'p-4' : 'p-6 md:p-10')}>
        <Skeleton className="h-8 w-48 mb-6" />
        <Skeleton className="h-12 w-3/4 mb-4" />
        <Skeleton className="h-6 w-1/2 mb-3" />
        <Skeleton className="h-40 w-full mt-8" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <h1 className="text-2xl font-bold font-sans text-foreground">Paper not available</h1>
          <p className="text-muted-foreground font-sans">This paper is not publicly accessible or is still being processed.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('min-h-screen bg-background', isEmbed ? 'px-4 py-4' : 'px-4 md:px-8 py-8')}>
      {/* Toggle button (non-embed only) */}
      {!isEmbed && (
        <div className="flex justify-end mb-2 max-w-5xl mx-auto">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen((v) => !v)}>
            {sidebarOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
          </Button>
        </div>
      )}

      <div className={cn(
        'max-w-5xl mx-auto',
        sidebarOpen && !isEmbed ? 'grid grid-cols-12 gap-6' : ''
      )}>
        <div className={cn(sidebarOpen && !isEmbed ? 'col-span-12 lg:col-span-8' : 'max-w-2xl mx-auto')}>
          <PaperHeader
            title={title}
            authors={authors}
            journal={journal}
            publicationDate={publicationDate}
            doi={doi}
            storagePath={storagePath}
            isOwner={false}
            authorsMode={false}
            paperId={numericId}
          />

          {numericId && (
            <div className="mb-6">
              <PersonalizedSummaryCard
                paperId={numericId}
                subPersonaId={subPersonaId}
                onPersonaChange={handlePersonaChange}
                allowedPersonas={allowedPersonas}
              />
            </div>
          )}

          {numericId && (
            <ModuleAccordionList
              paperId={numericId}
              subPersonaId={subPersonaId}
              moduleOrder={moduleOrder}
              figures={structured?.figures}
              authorsMode={false}
              authorEnrichments={{}}
              onEnrichmentsUpdate={() => {}}
            />
          )}

          {structured?.figures && structured.figures.length > 0 && (
            <div className="mt-6">
              <FiguresSection figures={structured.figures} storagePath={storagePath} />
            </div>
          )}
        </div>

        {sidebarOpen && !isEmbed && numericId && (
          <PaperSidebar
            paperId={numericId}
            paper={paper}
            subPersonaId={subPersonaId}
            isExpanded={sidebarOpen}
            onToggle={() => setSidebarOpen((v) => !v)}
            isOwner={false}
            authorsMode={false}
            authorScores={null}
            onAuthorsModeChange={() => {}}
            onAuthorScoresChange={() => {}}
          />
        )}
      </div>
    </div>
  );
};

export default PublicPaperViewPage;
