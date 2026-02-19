import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { PolicyViewPayload } from '@/hooks/usePolicyView';

interface PolicyTagsRowProps {
  policyTags: PolicyViewPayload['policy_tags'];
}

const PolicyTagsRow = ({ policyTags }: PolicyTagsRowProps) => {
  const [openTag, setOpenTag] = useState<string | null>(null);

  const getContextForArea = (area: string) =>
    policyTags.suggested_policy_contexts.find(
      (ctx) => ctx.context.toLowerCase().includes(area.toLowerCase()) ||
               area.toLowerCase().includes(ctx.context.toLowerCase().split(' ')[0])
    );

  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground font-sans font-medium whitespace-nowrap">
          Policy areas:
        </span>

        {policyTags.policy_areas.map((area) => {
          const context = getContextForArea(area);
          if (context) {
            return (
              <Popover key={area} open={openTag === area} onOpenChange={(o) => setOpenTag(o ? area : null)}>
                <PopoverTrigger asChild>
                  <button>
                    <Badge
                      variant="secondary"
                      className="cursor-pointer font-sans text-xs hover:bg-primary hover:text-primary-foreground transition-colors capitalize"
                    >
                      {area}
                    </Badge>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-3" align="start">
                  <p className="text-xs font-semibold font-sans text-foreground mb-1">{context.context}</p>
                  <p className="text-xs text-muted-foreground font-sans leading-relaxed">{context.relevance}</p>
                </PopoverContent>
              </Popover>
            );
          }
          return (
            <Badge key={area} variant="secondary" className="font-sans text-xs capitalize">
              {area}
            </Badge>
          );
        })}

        {/* Suggested policy contexts as clickable pills */}
        {policyTags.suggested_policy_contexts.map((ctx) => (
          <Popover
            key={ctx.context}
            open={openTag === ctx.context}
            onOpenChange={(o) => setOpenTag(o ? ctx.context : null)}
          >
            <PopoverTrigger asChild>
              <button>
                <Badge
                  variant="outline"
                  className="cursor-pointer font-sans text-xs border-primary/40 text-primary hover:bg-primary/10 transition-colors"
                >
                  {ctx.context} →
                </Badge>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-3" align="start">
              <p className="text-xs font-semibold font-sans text-foreground mb-1">{ctx.context}</p>
              <p className="text-xs text-muted-foreground font-sans leading-relaxed">{ctx.relevance}</p>
            </PopoverContent>
          </Popover>
        ))}

        {/* Relevance score pill at end */}
        <span className="ml-auto text-xs font-sans text-muted-foreground whitespace-nowrap">
          Policy relevance:{' '}
          <span className={cn(
            'font-semibold',
            policyTags.policy_relevance_score >= 7 ? 'text-primary' :
            policyTags.policy_relevance_score >= 4 ? 'text-muted-foreground' :
            'text-destructive'
          )}>
            {policyTags.policy_relevance_score}/10
          </span>
        </span>
      </div>
    </div>
  );
};

export default PolicyTagsRow;
