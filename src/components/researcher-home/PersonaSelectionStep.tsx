import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { SUB_PERSONA_REGISTRY } from '@/types/modules';
import type { SubPersonaId } from '@/types/modules';
import { Sparkles } from 'lucide-react';

interface PersonaSelectionStepProps {
  onConfirm: (selectedPersonas: SubPersonaId[]) => void;
  loading?: boolean;
}

const PARENT_ORDER = ['Researcher', 'Policy Maker', 'Funding Agency', 'Industry R&D'];

const grouped = PARENT_ORDER.map((parent) => ({
  parent,
  personas: SUB_PERSONA_REGISTRY.filter((p) => p.parentPersona === parent),
}));

export default function PersonaSelectionStep({ onConfirm, loading }: PersonaSelectionStepProps) {
  const [selected, setSelected] = useState<Set<SubPersonaId>>(new Set(['phd_postdoc']));

  const toggle = (id: SubPersonaId) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size > 1) next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold font-sans text-foreground mb-1">Choose Reading Personas</h3>
        <p className="text-xs text-muted-foreground">Select which perspectives to generate content for.</p>
      </div>

      <div className="space-y-3">
        {grouped.map((group) => (
          <div key={group.parent}>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
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

      <Button
        onClick={() => onConfirm(Array.from(selected))}
        disabled={selected.size === 0 || loading}
        className="w-full gap-2"
        size="lg"
      >
        <Sparkles className="h-4 w-4" />
        {loading ? 'Saving…' : `Continue to Paper++ (${selected.size} persona${selected.size > 1 ? 's' : ''})`}
      </Button>
    </div>
  );
}
