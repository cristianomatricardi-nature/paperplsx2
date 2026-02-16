import { useEffect, useState, useRef, useCallback } from 'react';
import { fetchSummary } from '@/lib/api';
import { SUB_PERSONA_REGISTRY } from '@/types/modules';
import type { SubPersonaId } from '@/types/modules';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import { Star, AlertCircle } from 'lucide-react';
import PersonaSelector from './PersonaSelector';

interface SummaryContent {
  summary_points: string[];
  relevance_score: number;
  why_this_matters: string;
}

interface PersonalizedSummaryCardProps {
  paperId: number;
  subPersonaId: SubPersonaId;
  onPersonaChange: (id: SubPersonaId) => void;
}

const PersonalizedSummaryCard = ({ paperId, subPersonaId, onPersonaChange }: PersonalizedSummaryCardProps) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [content, setContent] = useState<SummaryContent | null>(null);
  const cacheRef = useRef<Record<string, SummaryContent>>({});

  const persona = SUB_PERSONA_REGISTRY.find((p) => p.id === subPersonaId);

  const loadSummary = useCallback(async () => {
    // Check cache first
    if (cacheRef.current[subPersonaId]) {
      setContent(cacheRef.current[subPersonaId]);
      setError(false);
      return;
    }

    setLoading(true);
    setError(false);
    try {
      const data = await fetchSummary(paperId, subPersonaId);
      const summaryContent = (data?.content ?? data) as SummaryContent;
      cacheRef.current[subPersonaId] = summaryContent;
      setContent(summaryContent);
    } catch {
      setError(true);
      setContent(null);
    } finally {
      setLoading(false);
    }
  }, [paperId, subPersonaId]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const renderStars = (score: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${i < score ? 'fill-[hsl(var(--accent))] text-[hsl(var(--accent))]' : 'text-muted-foreground/30'}`}
      />
    ));
  };

  /** Turn "(p. 12)" references into styled spans */
  const renderBullet = (text: string) => {
    const parts = text.split(/(\(p\.\s*\d+(?:\s*[-–,]\s*\d+)*\))/g);
    return parts.map((part, i) =>
      /^\(p\./.test(part) ? (
        <span key={i} className="text-primary font-medium cursor-pointer hover:underline">
          {part}
        </span>
      ) : (
        <span key={i}>{part}</span>
      ),
    );
  };

  return (
    <Card className="relative overflow-hidden border-l-4 border-l-primary shadow-sm rounded-xl">
      {/* Header row */}
      <div className="flex items-center justify-between p-5 pb-3">
        <h2 className="font-serif text-lg font-semibold text-foreground flex items-center gap-2">
          <span className="text-xl">{persona?.id === 'phd_postdoc' ? '🎓' : persona?.id === 'pi_tenure' ? '🔬' : persona?.id === 'think_tank' ? '💡' : persona?.id === 'gov_institution' ? '🏛️' : persona?.id === 'funder_governmental' ? '🏦' : persona?.id === 'funder_private' ? '🤝' : '🏭'}</span>
          Key Insights for {persona?.shortLabel ?? 'You'}
        </h2>
        <PersonaSelector value={subPersonaId} onChange={onPersonaChange} />
      </div>

      <div className="px-5 pb-5 space-y-4">
        {/* Loading state */}
        {loading && (
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
            <Skeleton className="h-4 w-full" />
          </div>
        )}

        {/* Error state */}
        {!loading && error && (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <p>Summary generation in progress. Please try again in a moment.</p>
          </div>
        )}

        {/* Content */}
        {!loading && content && (
          <>
            {/* Relevance stars */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-sans text-muted-foreground mr-1">Relevance:</span>
              {renderStars(content.relevance_score)}
            </div>

            {/* Bullet points */}
            <ul className="space-y-2.5">
              {content.summary_points.map((point, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-foreground/90 leading-relaxed">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                  <span>{renderBullet(point)}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </Card>
  );
};

export default PersonalizedSummaryCard;
