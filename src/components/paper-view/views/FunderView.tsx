import { useState, useCallback, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, RefreshCw, FileJson, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import PersonaSelector from '@/components/paper-view/PersonaSelector';
import AimAttainmentGrid from './AimAttainmentGrid';
import KeyFindingCard from './KeyFindingCard';
import ConfidenceScorecard from './ConfidenceScorecard';
import ReusableOutputsPanel from './ReusableOutputsPanel';
import NextStepsGates from './NextStepsGates';
import StewardshipBadges from './StewardshipBadges';
import EvidenceDrawer from './EvidenceDrawer';
import { useFunderView } from '@/hooks/useFunderView';
import type { SubPersonaId } from '@/types/modules';
import type { FunderEvidenceRef } from '@/hooks/useFunderView';

interface FunderViewProps {
  paperId: number;
  subPersonaId: SubPersonaId;
  paper: Record<string, unknown> | null;
  onPersonaChange: (persona: SubPersonaId) => void;
  allowedPersonas?: SubPersonaId[];
}

const FunderView = ({ paperId, subPersonaId, paper, onPersonaChange, allowedPersonas }: FunderViewProps) => {
  const { payload, loading, error, refetch } = useFunderView(paperId, subPersonaId);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedRef, setSelectedRef] = useState<FunderEvidenceRef | null>(null);

  const evidenceMap = useMemo(() => {
    if (!payload?.evidence_refs) return new Map<string, FunderEvidenceRef>();
    return new Map(payload.evidence_refs.map((r) => [r.id, r]));
  }, [payload]);

  const citingClaims = useMemo(() => {
    if (!selectedRef || !payload) return [];
    const claims: Array<{ type: 'aim' | 'finding'; label: string }> = [];
    payload.aims?.forEach((a) => {
      if (a.evidence_refs?.includes(selectedRef.id)) {
        claims.push({ type: 'aim', label: a.statement });
      }
    });
    payload.key_findings?.forEach((f) => {
      if (f.evidence_refs?.includes(selectedRef.id)) {
        claims.push({ type: 'finding', label: f.finding });
      }
    });
    return claims;
  }, [selectedRef, payload]);

  const handleEvidenceClick = useCallback((refId: string) => {
    const ref = evidenceMap.get(refId);
    if (ref) {
      setSelectedRef(ref);
      setDrawerOpen(true);
    }
  }, [evidenceMap]);

  const handleExportJson = useCallback(() => {
    if (!payload) return;
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `funder-brief-${paperId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [payload, paperId]);

  return (
    <div className="space-y-5">
      <PersonaSelector value={subPersonaId} onChange={onPersonaChange} allowedPersonas={allowedPersonas} />

      {loading && (
        <div className="space-y-4 pt-2">
          <Skeleton className="h-20 w-full rounded-lg" />
          <Skeleton className="h-40 w-full rounded-lg" />
          <Skeleton className="h-32 w-full rounded-lg" />
          <p className="text-xs text-muted-foreground font-sans text-center pt-1">
            Generating grant accountability brief…
          </p>
        </div>
      )}

      {error && !loading && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-5 flex flex-col items-center gap-3 text-center">
          <AlertCircle className="h-6 w-6 text-destructive" />
          <p className="text-sm font-sans text-destructive">{error}</p>
          <Button variant="outline" size="sm" onClick={refetch} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </Button>
        </div>
      )}

      {payload && !loading && (
        <>
          {/* Header strip */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              {payload.metadata?.funders?.map((f, i) => (
                <Badge key={i} variant="secondary" className="text-xs">{f}</Badge>
              ))}
              {payload.metadata?.grant_ids?.map((g, i) => (
                <Badge key={i} variant="outline" className="text-xs font-mono">{g}</Badge>
              ))}
              {payload.metadata?.doi && (
                <a
                  href={`https://doi.org/${payload.metadata.doi}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  DOI <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleExportJson} title="Export JSON">
              <FileJson className="h-4 w-4" />
            </Button>
          </div>

          {/* Aim Attainment */}
          <AimAttainmentGrid aims={payload.aims ?? []} onEvidenceClick={handleEvidenceClick} />

          {/* Key Findings + Confidence — 2-column grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {payload.key_findings && payload.key_findings.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold uppercase tracking-wide">
                    Key Findings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {payload.key_findings.slice(0, 5).map((f) => (
                    <KeyFindingCard key={f.id} finding={f} onEvidenceClick={handleEvidenceClick} />
                  ))}
                </CardContent>
              </Card>
            )}

            <ConfidenceScorecard aims={payload.aims ?? []} />
          </div>

          {/* Outputs + Stewardship combined card */}
          {(payload.outputs || payload.compliance) && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold uppercase tracking-wide">
                  Outputs & Stewardship
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {payload.outputs && <ReusableOutputsPanel outputs={payload.outputs} />}
                {payload.compliance && <StewardshipBadges compliance={payload.compliance} />}
              </CardContent>
            </Card>
          )}

          {/* Next Steps */}
          <NextStepsGates nextSteps={payload.next_steps ?? []} limitations={payload.limitations ?? []} />

          {/* Disclaimer */}
          <p className="text-[11px] text-muted-foreground font-sans italic text-center pt-2 border-t border-border mt-4">
            {payload.disclaimer ?? 'This summary reflects one paper and does not measure real-world impact.'}
          </p>

          <EvidenceDrawer
            open={drawerOpen}
            onOpenChange={setDrawerOpen}
            evidenceRef={selectedRef}
            citingClaims={citingClaims}
          />
        </>
      )}
    </div>
  );
};

export default FunderView;
