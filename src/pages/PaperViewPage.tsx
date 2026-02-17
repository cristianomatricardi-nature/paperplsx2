import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { useRealtimePaper } from '@/hooks/useRealtimePaper';
import { useAuth } from '@/hooks/useAuth';
import { MODULE_ORDER_BY_PERSONA } from '@/lib/constants';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ArrowLeft, PanelRightClose, PanelRightOpen } from 'lucide-react';
import PaperSidebar from '@/components/paper-view/PaperSidebar';
import FiguresSection from '@/components/paper-view/FiguresSection';
import PaperHeader from '@/components/paper-view/PaperHeader';
import PersonalizedSummaryCard from '@/components/paper-view/PersonalizedSummaryCard';
import ModuleAccordionList from '@/components/paper-view/ModuleAccordionList';
import AiAgentConsole from '@/components/paper-view/AiAgentConsole';
import PersonaSelectionStep from '@/components/researcher-home/PersonaSelectionStep';
import { toast } from 'sonner';
import type { SubPersonaId, ModuleId } from '@/types/modules';
import type { Author } from '@/types/database';
import type { StructuredPaper } from '@/types/structured-paper';
import type { AuthorEnrichments } from '@/components/paper-view/AuthorEnrichmentPanel';
import type { ReplicationCartItem } from '@/components/paper-view/ReplicationCart';

const PaperViewPage = () => {
  const { paperId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const numericId = paperId ? Number(paperId) : null;

  // Core data
  const [paper, setPaper] = useState<Record<string, unknown> | null>(null);
  const [structured, setStructured] = useState<StructuredPaper | null>(null);
  const [loading, setLoading] = useState(true);

  // Authors mode
  const [authorsMode, setAuthorsMode] = useState(false);
  const isOwner = !!(user && paper && paper.user_id === user.id);

  // Author enrichments (kept in sync with DB)
  const [authorEnrichments, setAuthorEnrichments] = useState<AuthorEnrichments>({});

  // Author impact scores
  const [authorScores, setAuthorScores] = useState<Record<string, number> | null>(null);

  // Persona
  const [subPersonaId, setSubPersonaId] = useState<SubPersonaId>('phd_postdoc');
  const [moduleOrder, setModuleOrder] = useState<ModuleId[]>(MODULE_ORDER_BY_PERSONA['phd_postdoc']);
  const [allowedPersonas, setAllowedPersonas] = useState<SubPersonaId[] | undefined>(undefined);
  const [personasConfirmed, setPersonasConfirmed] = useState(false);
  const [savingPersonas, setSavingPersonas] = useState(false);

  // Sidebar
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Replication cart
  const [cartItems, setCartItems] = useState<ReplicationCartItem[]>([]);

  // Pipeline cart
  const [pipelineCartItems, setPipelineCartItems] = useState<ReplicationCartItem[]>([]);

  // Realtime
  const { paper: realtimePaper } = useRealtimePaper(numericId);

  // Merge realtime updates
  useEffect(() => {
    if (realtimePaper) {
      setPaper((prev) => ({ ...prev, ...realtimePaper }));
    }
  }, [realtimePaper]);

  // Parallel data fetch on mount
  useEffect(() => {
    if (!numericId) return;

    const load = async () => {
      setLoading(true);
      const [paperRes, structuredRes] = await Promise.all([
        supabase.from('papers').select('*').eq('id', numericId).single(),
        supabase.from('structured_papers').select('*').eq('paper_id', numericId).single(),
      ]);

      if (paperRes.data) {
        setPaper(paperRes.data as Record<string, unknown>);
        setAuthorScores((paperRes.data as any).author_impact_scores ?? null);
        const sp = (paperRes.data as any).selected_personas as SubPersonaId[] | null;
        if (sp && sp.length > 0) {
          setAllowedPersonas(sp);
          if (!sp.includes(subPersonaId)) {
            setSubPersonaId(sp[0]);
            setModuleOrder(MODULE_ORDER_BY_PERSONA[sp[0]]);
          }
        }
      }
      if (structuredRes.data) {
        setStructured(structuredRes.data as unknown as StructuredPaper);
        setAuthorEnrichments(((structuredRes.data as any).author_enrichments as AuthorEnrichments) ?? {});
      }

      setLoading(false);
    };

    load();
  }, [numericId]);

  // Persona change handler
  const handlePersonaChange = useCallback(
    (newPersona: SubPersonaId) => {
      setSubPersonaId(newPersona);
      setModuleOrder(MODULE_ORDER_BY_PERSONA[newPersona]);
    },
    [],
  );

  // Check if persona selection gate should show
  const selectedPersonas = (paper?.selected_personas as SubPersonaId[] | null) ?? ['phd_postdoc'];
  const isDefaultPersonas = selectedPersonas.length === 1 && selectedPersonas[0] === 'phd_postdoc';
  const needsPersonaSelection = isOwner && isDefaultPersonas && !personasConfirmed && !loading;

  // Handle persona confirmation from the gate
  const handlePersonasConfirm = useCallback(async (chosen: SubPersonaId[]) => {
    if (!numericId) return;
    setSavingPersonas(true);
    const { error } = await supabase
      .from('papers')
      .update({ selected_personas: chosen as unknown as any })
      .eq('id', numericId);
    setSavingPersonas(false);
    if (error) {
      toast.error('Failed to save persona selection');
      return;
    }
    setPaper((prev) => prev ? { ...prev, selected_personas: chosen } : prev);
    setAllowedPersonas(chosen);
    setSubPersonaId(chosen[0]);
    setModuleOrder(MODULE_ORDER_BY_PERSONA[chosen[0]]);
    setPersonasConfirmed(true);
  }, [numericId]);

  // Derive fields from paper
  const title = (paper?.title as string) ?? null;
  const authors = (paper?.authors as Author[] | null) ?? null;
  const journal = (paper?.journal as string) ?? null;
  const publicationDate = (paper?.publication_date as string) ?? null;
  const doi = (paper?.doi as string) ?? null;
  const storagePath = (paper?.storage_path as string) ?? null;

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6 md:p-10">
        <Skeleton className="h-8 w-48 mb-6" />
        <Skeleton className="h-12 w-3/4 mb-4" />
        <Skeleton className="h-6 w-1/2 mb-3" />
        <Skeleton className="h-6 w-1/3 mb-8" />
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 lg:col-span-8 space-y-4">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
          <div className="col-span-12 lg:col-span-4 space-y-4">
            <Skeleton className="h-60 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (needsPersonaSelection) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="w-full max-w-lg">
          <h2 className="text-lg font-semibold font-sans text-foreground mb-1">
            {title ?? 'Your Paper'}
          </h2>
          <p className="text-sm text-muted-foreground mb-6">Choose which reading perspectives to generate before viewing.</p>
          <PersonaSelectionStep onConfirm={handlePersonasConfirm} loading={savingPersonas} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/95 backdrop-blur px-4 md:px-8 py-2">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 font-sans text-muted-foreground hover:text-foreground"
          onClick={() => navigate('/researcher-home')}
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 hidden lg:flex"
          onClick={() => setSidebarOpen((o) => !o)}
        >
          {sidebarOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
        </Button>
      </div>

      {/* Main grid */}
      <div className={cn('grid min-h-[calc(100vh-3.5rem)]', sidebarOpen ? 'grid-cols-12' : 'flex')}>
        {/* Main content area */}
        <div className={sidebarOpen ? 'col-span-12 lg:col-span-8 px-4 md:px-8 py-8' : 'flex-1 px-4 md:px-8 py-8'}>
          <div className="max-w-2xl mx-auto">
          <PaperHeader
            title={title}
            authors={authors}
            journal={journal}
            publicationDate={publicationDate}
            doi={doi}
            storagePath={storagePath}
            isOwner={isOwner}
            authorsMode={authorsMode}
            onAuthorsModeChange={setAuthorsMode}
            paperId={numericId}
          />

            {numericId && subPersonaId === 'ai_agent' ? (
              <AiAgentConsole
                paperId={numericId}
                subPersonaId={subPersonaId}
                onPersonaChange={handlePersonaChange}
                allowedPersonas={allowedPersonas}
              />
            ) : (
              <>
                {/* Summary card */}
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

                {/* Module accordion list */}
                {numericId && (
                  <ModuleAccordionList
                    paperId={numericId}
                    subPersonaId={subPersonaId}
                    moduleOrder={moduleOrder}
                    figures={structured?.figures}
                    authorsMode={authorsMode}
                    authorEnrichments={authorEnrichments}
                    onEnrichmentsUpdate={setAuthorEnrichments}
                  />
                )}

                {/* Figures section */}
                {structured?.figures && structured.figures.length > 0 && (
                  <div className="mt-6">
                    <FiguresSection figures={structured.figures} storagePath={storagePath} />
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Sidebar */}
        {numericId && (
          <PaperSidebar
            paperId={numericId}
            paper={paper}
            subPersonaId={subPersonaId}
            isExpanded={sidebarOpen}
            onToggle={() => setSidebarOpen((o) => !o)}
            isOwner={isOwner}
            authorsMode={authorsMode}
            onAuthorsModeChange={setAuthorsMode}
            authorScores={authorScores}
            onAuthorScoresChange={setAuthorScores}
            cartItems={cartItems}
            onCartUpdate={setCartItems}
            pipelineCartItems={pipelineCartItems}
            onPipelineCartUpdate={setPipelineCartItems}
          />
        )}
      </div>
    </div>
  );
};

export default PaperViewPage;
