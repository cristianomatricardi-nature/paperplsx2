import { useState, useCallback } from 'react';
import { Plus, Link2, GitBranch, AlertTriangle, X, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { ModuleId } from '@/types/modules';

export interface ModuleEnrichment {
  context: string;
  datasets: string[];
  code_repos: string[];
  corrections: string[];
}

export type AuthorEnrichments = Record<string, ModuleEnrichment>;

interface AuthorEnrichmentPanelProps {
  paperId: number;
  moduleId: ModuleId;
  enrichments: AuthorEnrichments;
  onUpdate: (enrichments: AuthorEnrichments) => void;
}

type ActiveField = 'context' | 'dataset' | 'code_repo' | 'correction' | null;

const EMPTY: ModuleEnrichment = { context: '', datasets: [], code_repos: [], corrections: [] };

const AuthorEnrichmentPanel = ({ paperId, moduleId, enrichments, onUpdate }: AuthorEnrichmentPanelProps) => {
  const [activeField, setActiveField] = useState<ActiveField>(null);
  const [inputValue, setInputValue] = useState('');
  const [saving, setSaving] = useState(false);

  const current = enrichments[moduleId] ?? { ...EMPTY };

  const save = useCallback(async (updated: ModuleEnrichments) => {
    setSaving(true);
    const { error } = await supabase
      .from('structured_papers')
      .update({ author_enrichments: updated as any })
      .eq('paper_id', paperId);
    setSaving(false);
    if (error) {
      toast.error('Failed to save enrichment');
    } else {
      onUpdate(updated);
      toast.success('Enrichment saved');
    }
  }, [paperId, onUpdate]);

  const handleSave = useCallback(async () => {
    if (!inputValue.trim()) return;
    const mod = { ...current };

    if (activeField === 'context') {
      mod.context = inputValue.trim();
    } else if (activeField === 'dataset') {
      mod.datasets = [...mod.datasets, inputValue.trim()];
    } else if (activeField === 'code_repo') {
      mod.code_repos = [...mod.code_repos, inputValue.trim()];
    } else if (activeField === 'correction') {
      mod.corrections = [...mod.corrections, inputValue.trim()];
    }

    const updated = { ...enrichments, [moduleId]: mod };
    await save(updated);
    setInputValue('');
    setActiveField(null);
  }, [activeField, inputValue, current, enrichments, moduleId, save]);

  const removeItem = useCallback(async (field: 'datasets' | 'code_repos' | 'corrections', index: number) => {
    const mod = { ...current };
    mod[field] = mod[field].filter((_, i) => i !== index);
    const updated = { ...enrichments, [moduleId]: mod };
    await save(updated);
  }, [current, enrichments, moduleId, save]);

  return (
    <div className="rounded-lg border border-dashed border-primary/30 bg-primary/5 p-4 space-y-3">
      <h4 className="text-xs font-sans font-semibold text-primary uppercase tracking-wide">Author Enrichments</h4>

      {/* Existing enrichments display */}
      {current.context && (
        <div className="text-sm font-sans text-foreground bg-card rounded-md p-2 border border-border">
          <span className="text-xs text-muted-foreground font-semibold">Context: </span>
          {current.context}
        </div>
      )}
      {current.datasets.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {current.datasets.map((url, i) => (
            <Badge key={i} variant="secondary" className="gap-1 text-xs">
              <Link2 className="h-3 w-3" /> {url}
              <button onClick={() => removeItem('datasets', i)} className="ml-1"><X className="h-3 w-3" /></button>
            </Badge>
          ))}
        </div>
      )}
      {current.code_repos.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {current.code_repos.map((url, i) => (
            <Badge key={i} variant="secondary" className="gap-1 text-xs">
              <GitBranch className="h-3 w-3" /> {url}
              <button onClick={() => removeItem('code_repos', i)} className="ml-1"><X className="h-3 w-3" /></button>
            </Badge>
          ))}
        </div>
      )}
      {current.corrections.length > 0 && (
        <div className="space-y-1">
          {current.corrections.map((c, i) => (
            <div key={i} className="text-sm font-sans text-foreground bg-card rounded-md p-2 border border-destructive/30 flex justify-between items-start gap-2">
              <span><AlertTriangle className="h-3 w-3 inline mr-1 text-destructive" />{c}</span>
              <button onClick={() => removeItem('corrections', i)}><X className="h-3 w-3 text-muted-foreground" /></button>
            </div>
          ))}
        </div>
      )}

      {/* Action buttons */}
      {!activeField && (
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => { setActiveField('context'); setInputValue(current.context); }}>
            <Plus className="h-3 w-3" /> Add Context
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => setActiveField('dataset')}>
            <Link2 className="h-3 w-3" /> Link Dataset
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => setActiveField('code_repo')}>
            <GitBranch className="h-3 w-3" /> Link Code Repo
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => setActiveField('correction')}>
            <AlertTriangle className="h-3 w-3" /> Add Correction
          </Button>
        </div>
      )}

      {/* Active input */}
      {activeField && (
        <div className="space-y-2">
          {activeField === 'context' || activeField === 'correction' ? (
            <Textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={activeField === 'context' ? 'Add supplementary context...' : 'Describe the correction or erratum...'}
              className="text-sm min-h-[80px]"
              autoFocus
            />
          ) : (
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={activeField === 'dataset' ? 'https://doi.org/...' : 'https://github.com/...'}
              className="text-sm"
              autoFocus
            />
          )}
          <div className="flex gap-2">
            <Button size="sm" className="gap-1.5 text-xs" onClick={handleSave} disabled={saving}>
              <Save className="h-3 w-3" /> Save
            </Button>
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => { setActiveField(null); setInputValue(''); }}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

// Fix the type alias used inside
type ModuleEnrichments = AuthorEnrichments;

export default AuthorEnrichmentPanel;
