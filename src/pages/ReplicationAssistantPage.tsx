import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, FlaskConical, Download, Beaker, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useStructuredMethods, useLabInventory, buildRequirements } from '@/hooks/useReplicationData';
import { MethodCard } from '@/components/replication/MethodCard';
import { GapSummary } from '@/components/replication/GapSummary';
import { RequirementsComparison } from '@/components/replication/RequirementsComparison';
import { CriticalNotes } from '@/components/replication/CriticalNotes';
import { useIsMobile } from '@/hooks/use-mobile';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { MethodStep } from '@/types/structured-paper';

const ReplicationAssistantPage = () => {
  const { paperId } = useParams();
  const numericId = paperId ? Number(paperId) : null;
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();

  const { data: structuredData, isLoading: loadingMethods } = useStructuredMethods(numericId);
  const { data: inventory = [], isLoading: loadingLab } = useLabInventory(user?.id ?? null);

  const methods = useMemo(() => (structuredData?.methods ?? []) as unknown as MethodStep[], [structuredData]);
  const paperTitle = useMemo(() => {
    const meta = structuredData?.metadata as Record<string, unknown> | null;
    return (meta?.title as string) ?? 'Untitled Paper';
  }, [structuredData]);
  const paperField = useMemo(() => {
    const meta = structuredData?.metadata as Record<string, unknown> | null;
    return (meta?.field as string) ?? null;
  }, [structuredData]);

  const [selectedIdx, setSelectedIdx] = useState<number | 'all' | null>(null);
  const [simulating, setSimulating] = useState(false);
  const loading = loadingMethods || loadingLab;

  const handleSimulateLab = async () => {
    if (!numericId || !user?.id) return;
    setSimulating(true);
    try {
      const { data, error } = await supabase.functions.invoke('simulate-lab', {
        body: { paper_id: numericId, user_id: user.id },
      });
      if (error) throw error;
      toast({ title: 'Lab Generated!', description: `${data.count} items added for ${data.field}.` });
      queryClient.invalidateQueries({ queryKey: ['lab-inventory', user.id] });
    } catch (e: any) {
      console.error(e);
      toast({ title: 'Simulation failed', description: e.message ?? 'Please try again.', variant: 'destructive' });
    } finally {
      setSimulating(false);
    }
  };

  const selectedMethods: MethodStep[] = useMemo(() => {
    if (selectedIdx === 'all') return methods;
    if (selectedIdx != null && methods[selectedIdx]) return [methods[selectedIdx]];
    return [];
  }, [selectedIdx, methods]);

  const requirements = useMemo(
    () => selectedMethods.flatMap(m => buildRequirements(m, inventory as any)),
    [selectedMethods, inventory]
  );

  const criticalNotes = useMemo(
    () => selectedMethods.flatMap(m => m.critical_notes ?? []),
    [selectedMethods]
  );

  // Export checklist
  const handleExport = () => {
    const lines = ['# Replication Checklist', `Paper: ${paperTitle}`, ''];
    requirements.forEach(r => {
      const icon = r.status === 'available' ? '✅' : r.status === 'check' ? '⚠️' : '❌';
      lines.push(`${icon} [${r.type}] ${r.name} — ${r.status === 'available' ? 'Available' : r.status === 'check' ? 'Check compatibility' : 'Missing'}`);
    });
    if (criticalNotes.length) {
      lines.push('', '## Critical Notes');
      criticalNotes.forEach(n => lines.push(`⚠️ ${n}`));
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'replication-checklist.md';
    a.click();
    URL.revokeObjectURL(url);
  };

  // No lab inventory prompt
  if (!loading && inventory.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <Card className="max-w-md text-center">
          <CardContent className="pt-8 pb-6 space-y-4">
            <Beaker className="mx-auto h-12 w-12 text-muted-foreground" />
            <h2 className="text-xl font-semibold font-serif">Set Up Your Digital Lab</h2>
            <p className="text-sm text-muted-foreground">
              Add instruments, reagents, and software to your Digital Lab first to use the Replication Assistant.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <Button asChild variant="outline">
                <Link to="/digital-lab">Go to Digital Lab</Link>
              </Button>
              <Button onClick={handleSimulateLab} disabled={simulating} className="gap-1.5">
                {simulating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {paperField ? `Generating lab for ${paperField}…` : 'Generating lab…'}
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Simulate a Lab
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card px-4 py-4 sm:px-6">
        <div className="mx-auto max-w-7xl flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to={`/paper/${paperId}`}><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-serif font-semibold truncate">Replication Assistant</h1>
              <Badge className="shrink-0 gap-1 text-[10px]">
                <FlaskConical className="h-3 w-3" /> Replicate
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground truncate">{paperTitle}</p>
          </div>
        </div>
      </header>

      {loading ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : methods.length === 0 ? (
        <div className="flex flex-1 items-center justify-center p-6">
          <p className="text-muted-foreground">No methods found for this paper.</p>
        </div>
      ) : (
        <div className={`mx-auto max-w-7xl flex-1 w-full ${isMobile ? 'flex flex-col' : 'flex'} gap-6 p-4 sm:p-6`}>
          {/* Method Selector */}
          <aside className={`${isMobile ? 'w-full' : 'w-[300px] shrink-0'} space-y-2`}>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Methods</h2>
            <button
              onClick={() => setSelectedIdx('all')}
              className={`w-full rounded-lg border p-3 text-left text-sm font-medium transition-colors ${
                selectedIdx === 'all'
                  ? 'border-primary bg-primary/5 ring-1 ring-primary text-foreground'
                  : 'border-border hover:bg-muted/50 text-muted-foreground'
              }`}
            >
              Select All ({methods.length} methods)
            </button>
            {methods.map((m, i) => (
              <MethodCard
                key={m.id}
                method={m}
                index={i}
                selected={selectedIdx === i}
                onClick={() => setSelectedIdx(i)}
              />
            ))}
          </aside>

          {/* Comparison Panel */}
          <main className="flex-1 min-w-0 space-y-6">
            {selectedIdx == null ? (
              <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-border p-12">
                <p className="text-sm text-muted-foreground">Select a method to see the comparison</p>
              </div>
            ) : (
              <>
                <GapSummary requirements={requirements} />
                <RequirementsComparison requirements={requirements} />
                <CriticalNotes notes={criticalNotes} />
              </>
            )}
          </main>
        </div>
      )}

      {/* Action Bar */}
      {selectedIdx != null && !loading && (
        <footer className="sticky bottom-0 border-t border-border bg-card px-4 py-3 sm:px-6">
          <div className="mx-auto max-w-7xl flex justify-end gap-3">
            <Button variant="outline" asChild>
              <Link to="/digital-lab">Update My Lab</Link>
            </Button>
            <Button onClick={handleExport} className="gap-1.5">
              <Download className="h-4 w-4" /> Export Checklist
            </Button>
          </div>
        </footer>
      )}
    </div>
  );
};

export default ReplicationAssistantPage;
