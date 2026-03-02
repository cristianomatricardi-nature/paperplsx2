import { Badge } from '@/components/ui/badge';
import { BookOpen, Lightbulb } from 'lucide-react';
import type { KeyConcept } from '@/hooks/useEducatorView';

interface SimplifiedExplanationProps {
  summary: string;
  keyConcepts: KeyConcept[];
  prerequisiteKnowledge: string[];
}

const SimplifiedExplanation = ({ summary, keyConcepts, prerequisiteKnowledge }: SimplifiedExplanationProps) => {
  return (
    <div className="space-y-4">
      {/* Summary */}
      <div>
        <h3 className="text-sm font-semibold font-sans text-foreground mb-2 uppercase tracking-wide flex items-center gap-2">
          <BookOpen className="h-4 w-4" />
          Simplified Explanation
        </h3>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm font-sans text-foreground leading-relaxed whitespace-pre-line">{summary}</p>
        </div>
      </div>

      {/* Key Concepts */}
      {keyConcepts && keyConcepts.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <Lightbulb className="h-3.5 w-3.5" />
            Key Concepts
          </h4>
          <div className="grid grid-cols-1 gap-2">
            {keyConcepts.map((concept, i) => (
              <div key={i} className="rounded-lg border border-border bg-card p-3 space-y-1">
                <p className="text-sm font-sans font-semibold text-foreground">{concept.term}</p>
                <p className="text-xs text-muted-foreground">{concept.definition}</p>
                {concept.analogy && (
                  <p className="text-xs text-primary italic">💡 {concept.analogy}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Prerequisites */}
      {prerequisiteKnowledge && prerequisiteKnowledge.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
            Prerequisite Knowledge
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {prerequisiteKnowledge.map((p, i) => (
              <Badge key={i} variant="outline" className="text-[11px]">{p}</Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SimplifiedExplanation;
