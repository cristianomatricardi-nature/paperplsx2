import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { renderWithPageRefs } from './PageReference';

interface ClaimData {
  statement?: string;
  evidence?: string;
  evidence_summary?: string;
  strength?: 'strong' | 'moderate' | 'preliminary' | 'speculative';
  statistics?: string[];
  figure_refs?: string[];
  related_figure_ids?: string[];
  method_refs?: string[];
  related_method_ids?: string[];
  page_numbers?: number[];
}

const STRENGTH_STYLES: Record<string, { border: string; badge: string }> = {
  strong: { border: 'border-l-green-500', badge: 'bg-green-50 text-green-700' },
  moderate: { border: 'border-l-blue-500', badge: 'bg-blue-50 text-blue-700' },
  preliminary: { border: 'border-l-yellow-500', badge: 'bg-yellow-50 text-yellow-700' },
  speculative: { border: 'border-l-gray-400', badge: 'bg-gray-100 text-gray-600' },
};

export function ClaimCard({ claim }: { claim: ClaimData }) {
  const strength = claim.strength ?? 'moderate';
  const styles = STRENGTH_STYLES[strength] ?? STRENGTH_STYLES.moderate;
  const evidence = claim.evidence ?? claim.evidence_summary ?? '';
  const figRefs = claim.figure_refs ?? claim.related_figure_ids ?? [];
  const methodRefs = claim.method_refs ?? claim.related_method_ids ?? [];

  return (
    <div className={cn('rounded-md border border-border bg-card p-4 border-l-4 space-y-2', styles.border)}>
      <div className="flex items-center gap-2">
        <Badge className={cn('text-[10px] font-medium border-0 capitalize', styles.badge)}>
          {strength}
        </Badge>
      </div>

      <p className="text-sm font-semibold text-foreground">{claim.statement}</p>

      {evidence && (
        <p className="text-sm text-muted-foreground leading-relaxed">
          {renderWithPageRefs(evidence)}
        </p>
      )}

      {/* Statistics */}
      {claim.statistics && claim.statistics.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {claim.statistics.map((stat, i) => (
            <span key={i} className="font-mono text-xs bg-muted px-2 py-0.5 rounded-sm text-foreground">
              {stat}
            </span>
          ))}
        </div>
      )}

      {/* Figure references */}
      {figRefs.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {figRefs.map((ref, i) => (
            <button
              key={i}
              className="text-xs bg-accent/10 text-accent px-2 py-0.5 rounded-full hover:bg-accent/20 transition-colors"
            >
              📊 {ref}
            </button>
          ))}
        </div>
      )}

      {/* Method references */}
      {methodRefs.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {methodRefs.map((ref, i) => (
            <button
              key={i}
              className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full hover:bg-purple-100 transition-colors"
            >
              📋 {ref}
            </button>
          ))}
        </div>
      )}

      {/* Page references */}
      {claim.page_numbers && claim.page_numbers.length > 0 && (
        <div className="flex gap-1">
          {claim.page_numbers.map((p) => (
            <span key={p} className="text-xs font-mono text-accent hover:underline cursor-pointer">
              (p.&nbsp;{p})
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
