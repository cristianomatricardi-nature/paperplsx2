import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PersonaSelector from '@/components/paper-view/PersonaSelector';
import EvidenceDashboardStrip from './EvidenceDashboardStrip';
import PolicyTagsRow from './PolicyTagsRow';
import PolicyBriefCard from './PolicyBriefCard';
import InfographicPanel from './InfographicPanel';
import PolicyContentMatcher from './PolicyContentMatcher';
import { usePolicyView } from '@/hooks/usePolicyView';
import type { SubPersonaId } from '@/types/modules';

interface PolicyMakerViewProps {
  paperId: number;
  subPersonaId: SubPersonaId;
  paper: Record<string, unknown> | null;
  onPersonaChange: (persona: SubPersonaId) => void;
  allowedPersonas?: SubPersonaId[];
}

const PolicyMakerView = ({
  paperId,
  subPersonaId,
  paper,
  onPersonaChange,
  allowedPersonas,
}: PolicyMakerViewProps) => {
  const { payload, loading, error, refetch } = usePolicyView(paperId, subPersonaId);

  const paperTitle = (paper?.title as string) ?? null;
  const journal = (paper?.journal as string) ?? null;
  const publicationDate = (paper?.publication_date as string) ?? null;

  return (
    <div className="space-y-4">
      {/* Persona selector — reused as-is */}
      <PersonaSelector value={subPersonaId} onChange={onPersonaChange} allowedPersonas={allowedPersonas} />

      {/* Loading state */}
      {loading && (
        <div className="space-y-4 pt-2">
          <Skeleton className="h-28 w-full rounded-lg" />
          <div className="flex gap-2">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-6 w-24 rounded-full" />)}
          </div>
           <Skeleton className="h-48 w-full rounded-lg" />
           <Skeleton className="h-64 w-full rounded-lg" />
          <p className="text-xs text-muted-foreground font-sans text-center pt-1">
            Generating policy intelligence brief…
          </p>
        </div>
      )}

      {/* Error state */}
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

      {/* Main content */}
      {payload && !loading && (
        <>
          {/* Evidence Dashboard Strip */}
          <EvidenceDashboardStrip strip={payload.executive_strip} />

          {/* Policy Tags Row */}
          <PolicyTagsRow policyTags={payload.policy_tags} />

          {/* Infographic Panel — full width */}
          <InfographicPanel
            paperId={paperId}
            paperTitle={paperTitle}
            infographicSpec={payload.infographic_spec}
            subPersonaId={subPersonaId}
          />

          {/* Policy Brief Card — full width */}
          <PolicyBriefCard
            paperTitle={paperTitle}
            journal={journal}
            publicationDate={publicationDate}
            policyTags={payload.policy_tags}
            policyBrief={payload.policy_brief}
            executiveStrip={payload.executive_strip}
          />

          {/* Policy Content Matcher */}
          <PolicyContentMatcher
            paperId={paperId}
            subPersonaId={subPersonaId}
            policyTags={payload.policy_tags}
          />
        </>
      )}
    </div>
  );
};

export default PolicyMakerView;
