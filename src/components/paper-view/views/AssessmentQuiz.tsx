import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ClipboardCheck, Eye, EyeOff, CheckCircle2, XCircle } from 'lucide-react';
import type { QuizQuestion } from '@/hooks/useEducatorView';

interface AssessmentQuizProps {
  questions: QuizQuestion[];
}

const AssessmentQuiz = ({ questions }: AssessmentQuizProps) => {
  const [revealedIds, setRevealedIds] = useState<Set<number>>(new Set());
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});

  if (!questions || questions.length === 0) return null;

  const toggleReveal = (idx: number) => {
    setRevealedIds((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  };

  const selectAnswer = (qIdx: number, optIdx: number) => {
    if (revealedIds.has(qIdx)) return;
    setSelectedAnswers((prev) => ({ ...prev, [qIdx]: optIdx }));
  };

  return (
    <div>
      <h3 className="text-sm font-semibold font-sans text-foreground mb-3 uppercase tracking-wide flex items-center gap-2">
        <ClipboardCheck className="h-4 w-4" />
        Assessment Quiz
      </h3>
      <div className="space-y-4">
        {questions.map((q, qIdx) => {
          const isRevealed = revealedIds.has(qIdx);
          const selected = selectedAnswers[qIdx];
          const isCorrect = selected === q.correct;

          return (
            <div key={qIdx} className="rounded-lg border border-border bg-card p-4 space-y-3">
              <p className="text-sm font-sans font-medium text-foreground">
                {qIdx + 1}. {q.question}
              </p>

              <div className="space-y-1.5">
                {q.options.map((opt, optIdx) => {
                  const isSelected = selected === optIdx;
                  const isCorrectOption = q.correct === optIdx;
                  let className = 'text-left w-full rounded-md border px-3 py-2 text-sm font-sans transition-colors ';

                  if (isRevealed && isCorrectOption) {
                    className += 'border-emerald-300 bg-emerald-50 text-emerald-800';
                  } else if (isRevealed && isSelected && !isCorrect) {
                    className += 'border-red-300 bg-red-50 text-red-800';
                  } else if (isSelected && !isRevealed) {
                    className += 'border-primary bg-primary/5 text-foreground';
                  } else {
                    className += 'border-border bg-background text-foreground hover:bg-muted/50';
                  }

                  return (
                    <button
                      key={optIdx}
                      onClick={() => selectAnswer(qIdx, optIdx)}
                      className={className}
                      disabled={isRevealed}
                    >
                      <span className="flex items-center gap-2">
                        <span className="font-mono text-xs text-muted-foreground">
                          {String.fromCharCode(65 + optIdx)}.
                        </span>
                        {opt}
                        {isRevealed && isCorrectOption && <CheckCircle2 className="h-4 w-4 text-emerald-600 ml-auto" />}
                        {isRevealed && isSelected && !isCorrect && optIdx === selected && <XCircle className="h-4 w-4 text-red-500 ml-auto" />}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-xs"
                  onClick={() => toggleReveal(qIdx)}
                >
                  {isRevealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  {isRevealed ? 'Hide answer' : 'Reveal answer'}
                </Button>
              </div>

              {isRevealed && q.explanation && (
                <p className="text-xs text-muted-foreground font-sans bg-muted/40 rounded-md p-2">
                  {q.explanation}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AssessmentQuiz;
