import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, RefreshCw, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PersonalizedSummaryCard from '@/components/paper-view/PersonalizedSummaryCard';
import LearningObjectivesPanel from './LearningObjectivesPanel';
import SimplifiedExplanation from './SimplifiedExplanation';
import KeyConceptsGrid from './KeyConceptsGrid';
import DiscussionQuestions from './DiscussionQuestions';
import ClassroomActivities from './ClassroomActivities';
import FurtherReadingList from './FurtherReadingList';
import { useEducatorView } from '@/hooks/useEducatorView';
import type { SubPersonaId } from '@/types/modules';

interface EducatorViewProps {
  paperId: number;
  subPersonaId: SubPersonaId;
  paper: Record<string, unknown> | null;
  onPersonaChange: (persona: SubPersonaId) => void;
  allowedPersonas?: SubPersonaId[];
}

const EducatorView = ({ paperId, subPersonaId, paper, onPersonaChange, allowedPersonas }: EducatorViewProps) => {
  const { payload, loading, error, refetch } = useEducatorView(paperId, subPersonaId);

  return (
    <div className="space-y-5">
      <PersonalizedSummaryCard paperId={paperId} subPersonaId={subPersonaId} onPersonaChange={onPersonaChange} allowedPersonas={allowedPersonas} />

      {loading && (
        <div className="space-y-4 pt-2">
          <Skeleton className="h-20 w-full rounded-lg" />
          <Skeleton className="h-40 w-full rounded-lg" />
          <Skeleton className="h-32 w-full rounded-lg" />
          <p className="text-xs text-muted-foreground font-sans text-center pt-1 flex items-center justify-center gap-1.5">
            <GraduationCap className="h-3.5 w-3.5" />
            Generating lesson plan…
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
          {/* Hero card — summary + prerequisites */}
          {payload.simplified_explanation && (
            <SimplifiedExplanation
              summary={payload.simplified_explanation.summary}
              prerequisiteKnowledge={payload.simplified_explanation.prerequisite_knowledge ?? []}
            />
          )}

          {/* Learning Objectives + Key Concepts — 2-column grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <LearningObjectivesPanel objectives={payload.learning_objectives ?? []} />
            {payload.simplified_explanation?.key_concepts && (
              <KeyConceptsGrid concepts={payload.simplified_explanation.key_concepts} />
            )}
          </div>

          {/* Teaching Resources — tabbed card */}
          {((payload.discussion_questions?.length ?? 0) > 0 ||
            (payload.classroom_activities?.length ?? 0) > 0 ||
            (payload.misconceptions?.length ?? 0) > 0) && (
            <Card>
              <CardHeader className="pb-0">
                <CardTitle className="text-sm font-semibold uppercase tracking-wide">
                  Teaching Resources
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-3">
                <Tabs defaultValue="discussion">
                  <TabsList className="w-full justify-start">
                    {(payload.discussion_questions?.length ?? 0) > 0 && (
                      <TabsTrigger value="discussion">Discussion</TabsTrigger>
                    )}
                    {(payload.classroom_activities?.length ?? 0) > 0 && (
                      <TabsTrigger value="activities">Activities</TabsTrigger>
                    )}
                    {(payload.misconceptions?.length ?? 0) > 0 && (
                      <TabsTrigger value="misconceptions">Misconceptions</TabsTrigger>
                    )}
                  </TabsList>

                  <TabsContent value="discussion">
                    <DiscussionQuestions questions={payload.discussion_questions ?? []} />
                  </TabsContent>

                  <TabsContent value="activities">
                    <ClassroomActivities activities={payload.classroom_activities ?? []} />
                  </TabsContent>

                  <TabsContent value="misconceptions">
                    <div className="space-y-2">
                      {payload.misconceptions?.map((m, i) => (
                        <div key={i} className="rounded-lg border border-amber-200 bg-amber-50/50 p-3 space-y-1">
                          <p className="text-sm font-sans text-foreground">
                            <span className="font-semibold text-amber-800">Misconception:</span> {m.misconception}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            <span className="font-semibold">Correction:</span> {m.correction}
                          </p>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}

          {/* Further Reading */}
          <FurtherReadingList readings={payload.further_reading ?? []} />

          {/* Disclaimer */}
          <p className="text-[11px] text-muted-foreground font-sans italic text-center pt-2 border-t border-border mt-4">
            This educational summary is designed for teaching purposes. Consult the original paper for research-level precision.
          </p>
        </>
      )}
    </div>
  );
};

export default EducatorView;
