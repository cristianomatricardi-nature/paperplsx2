import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CheckCircle2, ExternalLink, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PolicyViewPayload } from '@/hooks/usePolicyView';

interface PolicyBriefCardProps {
  paperTitle: string | null;
  journal: string | null;
  publicationDate: string | null;
  policyTags: PolicyViewPayload['policy_tags'];
  policyBrief: PolicyViewPayload['policy_brief'];
  executiveStrip: PolicyViewPayload['executive_strip'];
}

const EVIDENCE_QUALITY_COLORS: Record<string, string> = {
  Strong:      'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
  Moderate:    'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  Preliminary: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300 border-orange-200 dark:border-orange-800',
};

const PolicyBriefCard = ({
  paperTitle,
  journal,
  publicationDate,
  policyTags,
  policyBrief,
  executiveStrip,
}: PolicyBriefCardProps) => {
  const [dialogOpen, setDialogOpen] = useState(false);

  const qualityColor = EVIDENCE_QUALITY_COLORS[policyBrief.evidence_quality] ?? EVIDENCE_QUALITY_COLORS.Moderate;
  const scoreColor = executiveStrip.relevance_score >= 7
    ? 'text-emerald-700 dark:text-emerald-400'
    : executiveStrip.relevance_score >= 4
    ? 'text-amber-600 dark:text-amber-400'
    : 'text-destructive';

  return (
    <>
      <Card className="border-border/60 h-full flex flex-col">
        <CardHeader className="pb-3 space-y-2">
          {/* Evidence quality + score */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <Badge className={cn('font-sans text-xs border', qualityColor)}>
              {policyBrief.evidence_quality} Evidence
            </Badge>
            <span className="font-sans text-xs text-muted-foreground">
              Relevance:{' '}
              <span className={cn('font-bold tabular-nums', scoreColor)}>
                {executiveStrip.relevance_score}/10
              </span>
            </span>
          </div>

          {/* Relevance bar */}
          <Progress value={executiveStrip.relevance_score * 10} className="h-1" />

          {/* Title */}
          {paperTitle && (
            <h3 className="text-sm font-bold font-sans text-foreground leading-snug line-clamp-3">
              {paperTitle}
            </h3>
          )}

          {/* Tags */}
          <div className="flex flex-wrap gap-1">
            {policyTags.policy_areas.slice(0, 3).map((area) => (
              <Badge key={area} variant="secondary" className="font-sans text-[10px] capitalize">
                {area}
              </Badge>
            ))}
          </div>

          {/* Journal + date */}
          {(journal || publicationDate) && (
            <p className="text-xs text-muted-foreground font-sans">
              {journal}{journal && publicationDate ? ' · ' : ''}{publicationDate}
            </p>
          )}
        </CardHeader>

        <CardContent className="flex-1 flex flex-col justify-end pt-0">
          <Button
            variant="default"
            size="sm"
            className="w-full gap-1.5 mt-4"
            onClick={() => setDialogOpen(true)}
          >
            Open Full Brief
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </CardContent>
      </Card>

      {/* Full Brief Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-sans text-base leading-snug">
              Policy Brief
              {paperTitle && <span className="block text-sm font-normal text-muted-foreground mt-1 line-clamp-2">{paperTitle}</span>}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 pt-1">
            {/* Evidence quality */}
            <div className="flex items-center gap-2">
              <Badge className={cn('font-sans text-xs border', qualityColor)}>
                {policyBrief.evidence_quality} Evidence
              </Badge>
              <span className="text-xs text-muted-foreground font-sans">
                Relevance: <span className={cn('font-bold', scoreColor)}>{executiveStrip.relevance_score}/10</span>
              </span>
            </div>

            {/* Key claims */}
            {policyBrief.key_claims_summary.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold font-sans text-muted-foreground uppercase tracking-wide mb-2">
                  Key Findings
                </h4>
                <ul className="space-y-1.5">
                  {policyBrief.key_claims_summary.map((claim, i) => (
                    <li key={i} className="flex gap-2 text-sm font-sans text-foreground">
                      <span className="mt-0.5 text-primary shrink-0">•</span>
                      <span className="leading-relaxed">{claim}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recommended actions */}
            {policyBrief.recommended_actions.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold font-sans text-muted-foreground uppercase tracking-wide mb-2">
                  Recommended Actions
                </h4>
                <ul className="space-y-1.5">
                  {policyBrief.recommended_actions.map((action, i) => (
                    <li key={i} className="flex gap-2 text-sm font-sans text-foreground">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <span className="leading-relaxed">{action}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Full brief text */}
            {policyBrief.full_brief_text && (
              <div>
                <h4 className="text-xs font-semibold font-sans text-muted-foreground uppercase tracking-wide mb-2">
                  Full Policy Brief
                </h4>
                <div className="text-sm font-sans text-foreground leading-relaxed whitespace-pre-line bg-muted/40 rounded-md p-4 border border-border/40">
                  {policyBrief.full_brief_text}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PolicyBriefCard;
