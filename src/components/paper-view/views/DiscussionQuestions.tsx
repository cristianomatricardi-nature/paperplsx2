import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, ChevronDown, ChevronRight } from 'lucide-react';
import type { DiscussionQuestion } from '@/hooks/useEducatorView';

interface DiscussionQuestionsProps {
  questions: DiscussionQuestion[];
}

const difficultyColors: Record<string, string> = {
  introductory: 'bg-green-100 text-green-700 border-green-200',
  intermediate: 'bg-amber-100 text-amber-700 border-amber-200',
  advanced: 'bg-red-100 text-red-700 border-red-200',
};

const DiscussionQuestions = ({ questions }: DiscussionQuestionsProps) => {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  if (!questions || questions.length === 0) return null;

  return (
    <div>
      <h3 className="text-sm font-semibold font-sans text-foreground mb-3 uppercase tracking-wide flex items-center gap-2">
        <MessageCircle className="h-4 w-4" />
        Discussion Questions
      </h3>
      <div className="space-y-2">
        {questions.map((q, i) => {
          const isExpanded = expandedId === i;
          const diff = difficultyColors[q.difficulty] ?? difficultyColors.introductory;

          return (
            <div key={i} className="rounded-lg border border-border bg-card overflow-hidden">
              <button
                onClick={() => setExpandedId(isExpanded ? null : i)}
                className="w-full flex items-start gap-3 p-3 text-left"
              >
                <span className="mt-0.5">
                  {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                </span>
                <p className="text-sm font-sans text-foreground flex-1">{q.question}</p>
                <Badge className={`text-[10px] border capitalize shrink-0 ${diff}`}>{q.difficulty}</Badge>
              </button>
              {isExpanded && q.suggested_answer_points && q.suggested_answer_points.length > 0 && (
                <div className="px-10 pb-3">
                  <p className="text-xs font-semibold text-muted-foreground mb-1">Suggested answer points:</p>
                  <ul className="list-disc pl-4 space-y-0.5">
                    {q.suggested_answer_points.map((p, j) => (
                      <li key={j} className="text-xs text-muted-foreground font-sans">{p}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DiscussionQuestions;
