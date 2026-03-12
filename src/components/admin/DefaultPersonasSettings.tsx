import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Checkbox } from '@/components/ui/checkbox';
import { SUB_PERSONA_REGISTRY } from '@/types/modules';
import type { SubPersonaId } from '@/types/modules';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const PARENT_ORDER = ['Researcher', 'Policy Maker', 'Funding Agency', 'Educator', 'Industry R&D', 'AI Agent'];

const grouped = PARENT_ORDER.map((parent) => ({
  parent,
  personas: SUB_PERSONA_REGISTRY.filter((p) => p.parentPersona === parent),
}));

export default function DefaultPersonasSettings() {
  const [selected, setSelected] = useState<Set<SubPersonaId>>(new Set());
  const [loading, setLoading] = useState(true);
  const [settingsId, setSettingsId] = useState<string | null>(null);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('app_settings' as any)
        .select('id, default_personas')
        .limit(1)
        .single();
      if (data) {
        setSettingsId((data as any).id);
        const personas = (data as any).default_personas as SubPersonaId[];
        setSelected(new Set(personas));
      }
      setLoading(false);
    };
    fetch();
  }, []);

  const toggle = async (id: SubPersonaId) => {
    if (!settingsId) return;

    const next = new Set(selected);
    if (next.has(id)) {
      if (next.size <= 1) {
        toast.error('At least one persona must remain selected');
        return;
      }
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelected(next);

    const arr = Array.from(next);
    const { error } = await supabase
      .from('app_settings' as any)
      .update({ default_personas: arr, updated_at: new Date().toISOString() } as any)
      .eq('id', settingsId);

    if (error) {
      toast.error('Failed to save settings');
      // revert
      setSelected(selected);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-8 justify-center">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Loading settings…</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-1">Default Personas</h3>
        <p className="text-xs text-muted-foreground">
          Select which reading personas are generated for new papers. Changes apply to all future papers.
        </p>
      </div>

      <div className="space-y-4">
        {grouped.map((group) => (
          <div key={group.parent}>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              {group.parent}
            </p>
            <div className="space-y-1.5">
              {group.personas.map((persona) => (
                <label
                  key={persona.id}
                  className="flex items-start gap-2.5 rounded-md border border-border px-3 py-2 cursor-pointer hover:bg-muted/40 transition-colors"
                >
                  <Checkbox
                    checked={selected.has(persona.id)}
                    onCheckedChange={() => toggle(persona.id)}
                    className="mt-0.5"
                  />
                  <div className="min-w-0">
                    <span className="text-sm font-medium text-foreground">{persona.shortLabel}</span>
                    <p className="text-xs text-muted-foreground leading-snug">{persona.painPoint}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
