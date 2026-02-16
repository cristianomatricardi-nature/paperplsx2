import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchModuleContent } from '@/lib/api';
import type { ModuleDefinition, ModuleId, SubPersonaId } from '@/types/modules';
import type { Figure } from '@/types/structured-paper';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, FlaskConical } from 'lucide-react';
import { cn } from '@/lib/utils';
import ModuleContentRenderer from './ModuleContentRenderer';

interface ModuleAccordionProps {
  paperId: number;
  moduleId: ModuleId;
  subPersonaId: SubPersonaId;
  moduleDefinition: ModuleDefinition;
  isOpen: boolean;
  onToggle: () => void;
  cachedContent: unknown | null;
  onContentLoaded: (moduleId: ModuleId, content: unknown) => void;
  figures?: Figure[];
}

const RESEARCHER_PERSONAS: SubPersonaId[] = ['phd_postdoc', 'pi_tenure'];

const ModuleAccordion = ({
  paperId,
  moduleId,
  subPersonaId,
  moduleDefinition,
  isOpen,
  onToggle,
  cachedContent,
  onContentLoaded,
  figures = [],
}: ModuleAccordionProps) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const isCore = moduleDefinition.tier === 'core';
  const borderColor = isCore ? 'border-l-[#3B82F6]' : 'border-l-[#F59E0B]';
  const badgeBg = isCore ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700';

  const handleToggle = useCallback(async () => {
    onToggle();

    // If opening and no cached content, fetch
    if (!isOpen && !cachedContent && !loading) {
      setLoading(true);
      setError(false);
      try {
        const data = await fetchModuleContent(paperId, moduleId, subPersonaId);
        const content = data?.content ?? data;
        onContentLoaded(moduleId, content);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    }
  }, [isOpen, cachedContent, loading, paperId, moduleId, subPersonaId, onToggle, onContentLoaded]);

  const showReplicateButton =
    moduleId === 'M3' && RESEARCHER_PERSONAS.includes(subPersonaId);

  return (
    <div className={cn('rounded-xl border border-border bg-card overflow-hidden border-l-4 shadow-sm', borderColor)}>
      {/* Header / trigger */}
      <button
        onClick={handleToggle}
        className="flex w-full items-center justify-between px-5 py-[18px] text-left transition-colors hover:bg-muted/40"
      >
        <div className="flex items-center gap-3">
          <span className="font-sans text-base font-semibold text-foreground">
            {moduleDefinition.title}
          </span>
        </div>
        <ChevronDown
          className={cn(
            'h-4 w-4 text-muted-foreground transition-transform duration-200',
            isOpen && 'rotate-180',
          )}
        />
      </button>

      {/* Content panel */}
      <div
        className={cn(
          'grid transition-all duration-300 ease-in-out',
          isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
        )}
      >
        <div className="overflow-hidden">
          <div className="px-5 pb-5 pt-1 space-y-4">
            {/* Loading */}
            {loading && (
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-4/6" />
                <Skeleton className="h-4 w-3/5" />
              </div>
            )}

            {/* Error */}
            {!loading && error && !cachedContent && (
              <p className="text-sm text-muted-foreground">
                Content generation in progress. Please try again in a moment.
              </p>
            )}

            {/* Cached / loaded content */}
            {!loading && cachedContent && (
              <ModuleContentRenderer
                content={cachedContent}
                moduleId={moduleId}
                figures={figures}
              />
            )}

            {/* Replicate button for M3 + researcher personas */}
            {showReplicateButton && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 mt-2"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/replication/${paperId}`);
                }}
              >
                <FlaskConical className="h-3.5 w-3.5" />
                Replicate this
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModuleAccordion;
