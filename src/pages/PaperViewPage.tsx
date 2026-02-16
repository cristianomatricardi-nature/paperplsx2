import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useRealtimePaper } from '@/hooks/useRealtimePaper';
import { MODULE_ORDER_BY_PERSONA } from '@/lib/constants';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ArrowLeft, PanelRightClose, PanelRightOpen } from 'lucide-react';
import PaperHeader from '@/components/paper-view/PaperHeader';
import PersonalizedSummaryCard from '@/components/paper-view/PersonalizedSummaryCard';
import ModuleAccordionList from '@/components/paper-view/ModuleAccordionList';
import type { SubPersonaId, ModuleId } from '@/types/modules';
import type { Author } from '@/types/database';
import type { StructuredPaper } from '@/types/structured-paper';

const PaperViewPage = () => {
  const { paperId } = useParams();
  const navigate = useNavigate();
  const numericId = paperId ? Number(paperId) : null;

  // Core data
  const [paper, setPaper] = useState<Record<string, unknown> | null>(null);
  const [structured, setStructured] = useState<StructuredPaper | null>(null);
  const [loading, setLoading] = useState(true);

  // Persona
  const [subPersonaId, setSubPersonaId] = useState<SubPersonaId>('phd_postdoc');
  const [moduleOrder, setModuleOrder] = useState<ModuleId[]>(MODULE_ORDER_BY_PERSONA['phd_postdoc']);

  // Sidebar
  const [sidebarOpen, setSidebarOpen] = useState(true);

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

      if (paperRes.data) setPaper(paperRes.data as Record<string, unknown>);
      if (structuredRes.data) {
        setStructured(structuredRes.data as unknown as StructuredPaper);
      }

      setLoading(false);
    };

    load();
  }, [numericId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Persona change handler
  const handlePersonaChange = useCallback(
    (newPersona: SubPersonaId) => {
      setSubPersonaId(newPersona);
      setModuleOrder(MODULE_ORDER_BY_PERSONA[newPersona]);
    },
    [],
  );

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
      <div className="px-4 md:px-8 py-6">
        <PaperHeader
          title={title}
          authors={authors}
          journal={journal}
          publicationDate={publicationDate}
          doi={doi}
          storagePath={storagePath}
        />

        <div className="grid grid-cols-12 gap-6">
          {/* Main content area */}
          <div className={sidebarOpen ? 'col-span-12 lg:col-span-8' : 'col-span-12'}>
            {/* Summary card */}
            {numericId && (
              <div className="mb-6">
                <PersonalizedSummaryCard
                  paperId={numericId}
                  subPersonaId={subPersonaId}
                  onPersonaChange={handlePersonaChange}
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
              />
            )}
          </div>

          {/* Sidebar */}
          {sidebarOpen && (
            <aside className="col-span-12 lg:col-span-4">
              <div className="sticky top-14 space-y-4">
                {/* Table of Contents placeholder */}
                <div className="rounded-md border border-border bg-card p-4">
                  <h3 className="font-serif text-sm font-semibold text-foreground mb-3">Table of Contents</h3>
                  {structured?.sections?.length ? (
                    <ul className="space-y-1.5">
                      {structured.sections.map((sec, i) => (
                        <li key={i} className="font-sans text-sm text-muted-foreground hover:text-foreground cursor-pointer">
                          {sec.heading}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="font-sans text-xs text-muted-foreground">Sections will appear once processing completes.</p>
                  )}
                </div>

                {/* Figures placeholder */}
                <div className="rounded-md border border-border bg-card p-4">
                  <h3 className="font-serif text-sm font-semibold text-foreground mb-3">Figures</h3>
                  {structured?.figures?.length ? (
                    <ul className="space-y-1.5">
                      {structured.figures.map((fig, i) => (
                        <li key={i} className="font-sans text-xs text-muted-foreground">
                          {fig.caption?.slice(0, 60)}…
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="font-sans text-xs text-muted-foreground">No figures extracted yet.</p>
                  )}
                </div>
              </div>
            </aside>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaperViewPage;
