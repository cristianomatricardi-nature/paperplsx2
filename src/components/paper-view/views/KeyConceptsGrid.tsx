import { Lightbulb } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { KeyConcept } from '@/hooks/useEducatorView';

interface KeyConceptsGridProps {
  concepts: KeyConcept[];
}

const KeyConceptsGrid = ({ concepts }: KeyConceptsGridProps) => {
  if (!concepts || concepts.length === 0) return null;

  return (
    <Card className="h-fit">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold uppercase tracking-wide flex items-center gap-2">
          <Lightbulb className="h-4 w-4" />
          Key Concepts
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {concepts.map((concept, i) => (
          <div key={i} className="rounded-lg border border-border bg-muted/30 p-3 space-y-1">
            <p className="text-sm font-sans font-semibold text-foreground">{concept.term}</p>
            <p className="text-xs text-muted-foreground">{concept.definition}</p>
            {concept.analogy && (
              <p className="text-xs text-primary italic">💡 {concept.analogy}</p>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default KeyConceptsGrid;
