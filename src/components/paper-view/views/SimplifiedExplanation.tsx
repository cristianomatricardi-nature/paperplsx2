import { Badge } from '@/components/ui/badge';
import { BookOpen } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface SimplifiedExplanationProps {
  summary: string;
  prerequisiteKnowledge: string[];
}

const SimplifiedExplanation = ({ summary, prerequisiteKnowledge }: SimplifiedExplanationProps) => {
  return (
    <Card>
      <CardContent className="p-5 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground uppercase tracking-wide">
          <BookOpen className="h-4 w-4" />
          What This Paper Is About
        </div>
        <p className="text-sm font-sans text-foreground leading-relaxed whitespace-pre-line">{summary}</p>
        {prerequisiteKnowledge && prerequisiteKnowledge.length > 0 && (
          <div className="pt-2 border-t border-border">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Prerequisites
            </span>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {prerequisiteKnowledge.map((p, i) => (
                <Badge key={i} variant="outline" className="text-[11px]">{p}</Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SimplifiedExplanation;
