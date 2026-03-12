import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { useRealtimePaper } from '@/hooks/useRealtimePaper';
import { useAuth } from '@/hooks/useAuth';
import { MODULE_ORDER_BY_PERSONA, PARENT_PERSONA_MAP } from '@/lib/constants';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ArrowLeft, PanelRightClose, PanelRightOpen } from 'lucide-react';
import PaperSidebar from '@/components/paper-view/PaperSidebar';
import PaperHeader from '@/components/paper-view/PaperHeader';
import AiAgentConsole from '@/components/paper-view/AiAgentConsole';

import ResearcherView from '@/components/paper-view/views/ResearcherView';
import PolicyMakerView from '@/components/paper-view/views/PolicyMakerView';
import FunderView from '@/components/paper-view/views/FunderView';
import EducatorView from '@/components/paper-view/views/EducatorView';
import { toast } from 'sonner';
import type { SubPersonaId, ModuleId } from '@/types/modules';
import type { Author } from '@/types/database';
import type { StructuredPaper } from '@/types/structured-paper';
import type { AuthorEnrichments } from '@/components/paper-view/AuthorEnrichmentPanel';
import type { ReplicationCartItem } from '@/components/paper-view/ReplicationCart';
import { useFigureExtraction } from '@/hooks/useFigureExtraction';

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

  // Sidebar
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Replication cart
  const [cartItems, setCartItems] = useState<ReplicationCartItem[]>([]);

  // Pipeline cart
  const [pipelineCartItems, setPipelineCartItems] = useState<ReplicationCartItem[]>([]);

  // Module opened tracking (fire-and-forget)
  const handleModuleOpened = useCallback((moduleId: ModuleId) => {
    if (!user?.id || !numericId) return;
    supabase.from('user_activity_events').insert({
      user_id: user.id,
      paper_id: numericId,
      event_type: 'protocol_opened',
    });
  }, [user, numericId]);

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
      const [paperRes, structuredRes, settingsRes] = await Promise.all([
        supabase.from('papers').select('*').eq('id', numericId).single(),
        supabase.from('structured_papers').select('*').eq('paper_id', numericId).single(),
        supabase.from('app_settings' as any).select('default_personas').limit(1).single(),
      ]);

      const defaultPersonas = ((settingsRes.data as any)?.default_personas as SubPersonaId[]) ??
        ['phd_postdoc', 'pi_tenure', 'think_tank', 'science_educator', 'ai_agent', 'funder_private'];

      if (paperRes.data) {
        setPaper(paperRes.data as Record<string, unknown>);
        setAuthorScores((paperRes.data as any).author_impact_scores ?? null);
        let sp = (paperRes.data as any).selected_personas as SubPersonaId[] | null;

        // Auto-assign admin defaults if paper still has the old single-item default
        const isOldDefault = !sp || (sp.length === 1 && sp[0] === 'phd_postdoc');
        if (isOldDefault) {
          sp = defaultPersonas;
          // Fire-and-forget save
          supabase
            .from('papers')
            .update({ selected_personas: sp as unknown as any })
            .eq('id', numericId);
        }

        setAllowedPersonas(sp);
        if (!sp.includes(subPersonaId)) {
          setSubPersonaId(sp[0]);
          setModuleOrder(MODULE_ORDER_BY_PERSONA[sp[0]]);
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
      // Fire-and-forget activity event
      if (user?.id && numericId) {
        supabase.from('user_activity_events').insert({
          user_id: user.id,
          paper_id: numericId,
          event_type: 'persona_changed',
        });
      }
    },
    [user, numericId],
  );

  // Derive fields from paper
  const title = (paper?.title as string) ?? null;
  const authors = (paper?.authors as Author[] | null) ?? null;
  const journal = (paper?.journal as string) ?? null;
  const publicationDate = (paper?.publication_date as string) ?? null;
  const doi = (paper?.doi as string) ?? null;
  const storagePath = (paper?.storage_path as string) ?? null;

  // Refetch structured paper data (called after figure extraction succeeds)
  const refetchStructuredPaper = useCallback(async () => {
    if (!numericId) return;
    const { data } = await supabase
      .from('structured_papers')
      .select('*')
      .eq('paper_id', numericId)
      .single();
    if (data) {
      setStructured(data as unknown as StructuredPaper);
      setAuthorEnrichments(((data as any).author_enrichments as AuthorEnrichments) ?? {});
    }
  }, [numericId]);

  // Trigger figure extraction for figures missing image_url
  const structuredFigures = structured?.figures ?? null;
  useFigureExtraction(numericId, structuredFigures, storagePath, refetchStructuredPaper);

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
      <div className={cn(
        'mx-auto w-full max-w-[1200px] grid min-h-[calc(100vh-3.5rem)]',
        sidebarOpen ? 'grid-cols-1 lg:grid-cols-[1fr_320px]' : 'grid-cols-1'
      )}>
        {/* Main content area */}
        <div className={cn(
          'px-4 md:px-8 lg:px-10 py-8',
          authorsMode && 'bg-muted/20 border-t-2 border-t-primary/30'
        )}>
          <div>
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

            {(() => {
              if (!numericId) return null;
              const parentPersona = PARENT_PERSONA_MAP[subPersonaId];
              switch (parentPersona) {
                case 'AI Agent':
                  return (
                    <AiAgentConsole
                      paperId={numericId}
                      subPersonaId={subPersonaId}
                      onPersonaChange={handlePersonaChange}
                      allowedPersonas={allowedPersonas}
                    />
                  );
                case 'Policy Maker':
                  return (
                    <PolicyMakerView
                      paperId={numericId}
                      subPersonaId={subPersonaId}
                      paper={paper}
                      onPersonaChange={handlePersonaChange}
                      allowedPersonas={allowedPersonas}
                    />
                  );
                case 'Funding Agency':
                  return (
                    <FunderView
                      paperId={numericId}
                      subPersonaId={subPersonaId}
                      paper={paper}
                      onPersonaChange={handlePersonaChange}
                      allowedPersonas={allowedPersonas}
                    />
                  );
                case 'Educator':
                  return (
                    <EducatorView
                      paperId={numericId}
                      subPersonaId={subPersonaId}
                      paper={paper}
                      onPersonaChange={handlePersonaChange}
                      allowedPersonas={allowedPersonas}
                    />
                  );
                default:
                  // 'Researcher', and future fallback for 'Industry R&D'
                  return (
                    <ResearcherView
                      paperId={numericId}
                      subPersonaId={subPersonaId}
                      moduleOrder={moduleOrder}
                      structured={structured}
                      storagePath={storagePath}
                      authorsMode={authorsMode}
                      authorEnrichments={authorEnrichments}
                      onEnrichmentsUpdate={setAuthorEnrichments}
                      onPersonaChange={handlePersonaChange}
                      onModuleOpened={handleModuleOpened}
                      allowedPersonas={allowedPersonas}
                    />
                  );
              }
            })()}
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
