import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, GitFork, Download, Sparkles, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { VariableMappingTable, type PipelineVariable } from '@/components/analytical-pipeline/VariableMappingTable';
import { SensitivityPanel } from '@/components/analytical-pipeline/SensitivityPanel';
import type { PipelineStep } from '@/components/analytical-pipeline/DecisionPointCard';
import type { ReplicationCartItem } from '@/components/paper-view/ReplicationCart';

const AnalyticalPipelinePage = () => {
  const { paperId } = useParams();
  const navigate = useNavigate();
  const numericId = paperId ? Number(paperId) : null;

  const [paperTitle, setPaperTitle] = useState<string | null>(null);
  const [cartItems, setCartItems] = useState<ReplicationCartItem[]>([]);
  const [steps, setSteps] = useState<PipelineStep[]>([]);
  const [variables, setVariables] = useState<PipelineVariable[]>([]);
  const [summary, setSummary] = useState('');
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [activeAlternatives, setActiveAlternatives] = useState<Record<string, string>>({});
  const [scatterData, setScatterData] = useState<{ x: number; y: number; label?: string }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!numericId) return;
    supabase.from('papers').select('title').eq('id', numericId).single().then(({ data }) => {
      if (data) setPaperTitle(data.title);
    });
    const raw = sessionStorage.getItem(`analysis-cart-${numericId}`);
    if (raw) {
      try {
        setCartItems(JSON.parse(raw) as ReplicationCartItem[]);
      } catch { /* ignore */ }
    }
  }, [numericId]);

  // Fire analysis_used event on mount (fire-and-forget)
  useEffect(() => {
    if (!numericId) return;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user?.id) return;
      supabase.from('user_activity_events').insert({
        user_id: session.user.id,
        paper_id: numericId,
        event_type: 'analysis_used',
      }).select();
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (cartItems.length > 0 && steps.length === 0 && !loading) {
      runDecomposition();
    }
  }, [cartItems]);

  const runDecomposition = useCallback(async () => {
    if (!numericId || cartItems.length === 0) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('decompose-pipeline', {
        body: { paperId: numericId, items: cartItems },
      });
      if (error) throw error;
      if (data?.pipeline_steps) setSteps(data.pipeline_steps);
      if (data?.variables) setVariables(data.variables);
      if (data?.overall_summary) setSummary(data.overall_summary);
      if (data?.mock_scatter_data) setScatterData(data.mock_scatter_data);
    } catch (err: any) {
      console.error('Decomposition error:', err);
      toast.error('Failed to decompose pipeline');
    } finally {
      setLoading(false);
    }
  }, [numericId, cartItems]);

  const handleToggleAlternative = useCallback((stepId: string, alternative: string) => {
    setActiveAlternatives((prev) => ({
      ...prev,
      [stepId]: prev[stepId] === alternative ? '' : alternative,
    }));
  }, []);

  const handleMappingChange = useCallback((variableName: string, userVariable: string) => {
    setMappings((prev) => ({ ...prev, [variableName]: userVariable }));
  }, []);

  const handleExport = useCallback(() => {
    const exportData = { steps, variables, mappings, activeAlternatives, summary };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytical-pipeline-${numericId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [steps, variables, mappings, activeAlternatives, summary, numericId]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur px-4 md:px-8 py-3">
        <div className="flex items-center justify-between max-w-3xl mx-auto">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 font-sans text-muted-foreground hover:text-foreground"
            onClick={() => navigate(`/paper/${numericId}`)}
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handleExport} disabled={steps.length === 0}>
              <Download className="h-3.5 w-3.5" />
              Export
            </Button>
            <Button size="sm" className="gap-1.5 text-xs" onClick={runDecomposition} disabled={loading || cartItems.length === 0}>
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              AI Decompose
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 md:px-8 py-8 space-y-8">
        {/* Title */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <GitFork className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-semibold font-sans text-foreground">Analytical Pipeline</h1>
          </div>
          {paperTitle && (
            <p className="text-sm text-muted-foreground font-sans">{paperTitle}</p>
          )}
          {summary && (
            <p className="text-xs text-muted-foreground font-sans mt-2 leading-relaxed border-l-2 border-primary/30 pl-3">
              {summary}
            </p>
          )}
        </div>

        {/* Beta banner */}
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700 dark:text-amber-300 font-sans leading-relaxed">
            <strong>Beta:</strong> Visualizations use mocked data extrapolated from the manuscript. Figure extraction is not yet implemented.
          </p>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-12 gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground font-sans">Decomposing analytical pipeline…</span>
          </div>
        )}

        {!loading && (
          <>
            {/* Variable Mapping */}
            {variables.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold font-sans text-foreground mb-3 uppercase tracking-wider">
                  Variable Mapping
                </h2>
                <VariableMappingTable
                  variables={variables}
                  mappings={mappings}
                  onMappingChange={handleMappingChange}
                  scatterData={scatterData}
                />
              </section>
            )}

            {/* What-If Sandbox */}
            {steps.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold font-sans text-foreground mb-3 uppercase tracking-wider">
                  What-If Sandbox
                </h2>
                <SensitivityPanel
                  steps={steps}
                  activeAlternatives={activeAlternatives}
                  onToggleAlternative={handleToggleAlternative}
                />
              </section>
            )}
          </>
        )}

        {/* Empty state */}
        {!loading && cartItems.length === 0 && steps.length === 0 && (
          <div className="text-center py-16">
            <GitFork className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground font-sans">
              No items in the pipeline cart. Go back and drag claims or methods into the Pipeline Cart.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalyticalPipelinePage;
