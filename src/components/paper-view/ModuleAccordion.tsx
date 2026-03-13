import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchModuleContent } from '@/lib/api';
import type { ModuleDefinition, ModuleId, SubPersonaId } from '@/types/modules';
import type { Figure } from '@/types/structured-paper';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, FlaskConical, GripVertical, Pencil, Save, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import ModuleContentRenderer from './ModuleContentRenderer';
import AuthorEnrichmentPanel from './AuthorEnrichmentPanel';
import type { AuthorEnrichments } from './AuthorEnrichmentPanel';

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
  authorsMode?: boolean;
  authorEnrichments?: AuthorEnrichments;
  onEnrichmentsUpdate?: (e: AuthorEnrichments) => void;
  preGeneratedTitle?: string | null;
}

const RESEARCHER_PERSONAS: SubPersonaId[] = ['phd_postdoc', 'pi_tenure'];

/** Extract module_title from cached content if available */
function extractModuleTitle(content: unknown): string | null {
  if (content && typeof content === 'object' && 'module_title' in (content as Record<string, unknown>)) {
    return (content as Record<string, unknown>).module_title as string;
  }
  return null;
}

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
  authorsMode = false,
  authorEnrichments = {},
  onEnrichmentsUpdate,
  preGeneratedTitle = null,
}: ModuleAccordionProps) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);

  const isCore = moduleDefinition.tier === 'core';
  const borderColor = isCore ? 'border-l-primary' : 'border-l-[hsl(38,92%,50%)]';
  
  // Priority: cached content title > pre-generated title > null
  const contentTitle = extractModuleTitle(cachedContent) || preGeneratedTitle || null;

  const handleToggle = useCallback(async () => {
    onToggle();
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

  const handleEdit = useCallback(() => {
    const serialized = typeof cachedContent === 'string'
      ? cachedContent
      : JSON.stringify(cachedContent, null, 2);
    setEditValue(serialized);
    setEditing(true);
  }, [cachedContent]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      let parsed: unknown;
      try { parsed = JSON.parse(editValue); } catch { parsed = editValue; }
      const { error: dbError } = await supabase
        .from('generated_content_cache')
        .update({ content: parsed as any })
        .eq('paper_id', paperId)
        .eq('module_id', moduleId)
        .eq('persona_id', subPersonaId);
      if (dbError) throw dbError;
      onContentLoaded(moduleId, parsed);
      setEditing(false);
      toast.success('Module content updated');
    } catch {
      toast.error('Failed to save changes');
    } finally {
      setSaving(false);
    }
  }, [editValue, paperId, moduleId, subPersonaId, onContentLoaded]);

  const handleCancel = useCallback(() => {
    setEditing(false);
    setEditValue('');
  }, []);

  const showReplicateButton =
    moduleId === 'M3' && RESEARCHER_PERSONAS.includes(subPersonaId);

  const doiString = `10.paper++/${paperId}.${moduleId}.${subPersonaId}`;

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('application/json', JSON.stringify({
          sourceModule: moduleId,
          type: 'module',
          title: contentTitle || moduleDefinition.title,
          data: cachedContent ?? null,
        }));
        e.dataTransfer.effectAllowed = 'copy';
      }}
      className={cn(
        'rounded-xl border border-border bg-card overflow-hidden border-l-4 shadow-sm cursor-grab active:cursor-grabbing',
        borderColor,
      )}
    >
      {/* Header */}
      <button
        onClick={handleToggle}
        className="flex w-full items-start justify-between px-5 py-4 text-left transition-colors hover:bg-muted/40"
      >
        <div className="flex items-start gap-3 min-w-0">
          <GripVertical className="h-4 w-4 text-muted-foreground/50 shrink-0 mt-1" />
          <div className="min-w-0 space-y-1">
            {contentTitle && (
              <Badge
                variant="secondary"
                className="text-[10px] font-medium uppercase tracking-wider px-2 py-0"
              >
                {moduleDefinition.title}
              </Badge>
            )}
            <p className="font-sans text-base font-semibold text-foreground leading-snug">
              {contentTitle || moduleDefinition.title}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 mt-1">
          {authorsMode && isOpen && cachedContent && !editing && (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 text-xs h-7 px-2 text-primary"
              onClick={(e) => { e.stopPropagation(); handleEdit(); }}
            >
              <Pencil className="h-3 w-3" />
              Edit
            </Button>
          )}
          <ChevronDown
            className={cn(
              'h-4 w-4 text-muted-foreground transition-transform duration-200',
              isOpen && 'rotate-180',
            )}
          />
        </div>
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
            {loading && (
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-4/6" />
                <Skeleton className="h-4 w-3/5" />
              </div>
            )}

            {!loading && error && !cachedContent && (
              <p className="text-sm text-muted-foreground">
                Content generation in progress. Please try again in a moment.
              </p>
            )}

            {!loading && editing && (
              <div className="space-y-3">
                <Textarea
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="font-mono text-xs min-h-[200px]"
                />
                <div className="flex gap-2">
                  <Button size="sm" className="gap-1.5 text-xs" onClick={handleSave} disabled={saving}>
                    <Save className="h-3 w-3" />
                    {saving ? 'Saving...' : 'Save'}
                  </Button>
                  <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={handleCancel}>
                    <X className="h-3 w-3" />
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {!loading && !editing && cachedContent && (
              <ModuleContentRenderer
                content={cachedContent}
                moduleId={moduleId}
                figures={figures}
                paperId={paperId}
              />
            )}

            {authorsMode && isOpen && !loading && cachedContent && onEnrichmentsUpdate && (
              <AuthorEnrichmentPanel
                paperId={paperId}
                moduleId={moduleId}
                enrichments={authorEnrichments}
                onUpdate={onEnrichmentsUpdate}
              />
            )}

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

      {/* DOI-like footer — always visible */}
      <div className="border-t border-border px-5 py-2">
        <span className="font-mono text-[10px] text-muted-foreground select-all">
          {doiString}
        </span>
      </div>
    </div>
  );
};

export default ModuleAccordion;
