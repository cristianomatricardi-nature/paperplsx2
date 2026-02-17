import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SUB_PERSONA_REGISTRY } from '@/types/modules';
import type { SubPersonaId } from '@/types/modules';

interface PersonaSelectorProps {
  value: SubPersonaId;
  onChange: (value: SubPersonaId) => void;
  allowedPersonas?: SubPersonaId[];
}

const PARENT_ORDER = ['Researcher', 'Policy Maker', 'Funding Agency', 'Industry R&D', 'AI Agent'];

const grouped = PARENT_ORDER.map((parent) => ({
  parent,
  personas: SUB_PERSONA_REGISTRY.filter((p) => p.parentPersona === parent),
}));

const PersonaSelector = ({ value, onChange, allowedPersonas }: PersonaSelectorProps) => {
  const selected = SUB_PERSONA_REGISTRY.find((p) => p.id === value);

  const filteredGrouped = allowedPersonas
    ? grouped
        .map((g) => ({
          ...g,
          personas: g.personas.filter((p) => allowedPersonas.includes(p.id)),
        }))
        .filter((g) => g.personas.length > 0)
    : grouped;

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-sans text-muted-foreground whitespace-nowrap">Reading as:</span>
      <Select value={value} onValueChange={(v) => onChange(v as SubPersonaId)}>
        <SelectTrigger className="w-[200px] font-sans text-sm h-8 border-[hsl(var(--deep-blue))]/30">
          <SelectValue placeholder="Select persona">{selected?.shortLabel ?? 'Select'}</SelectValue>
        </SelectTrigger>
        <SelectContent className="bg-popover z-50">
          {filteredGrouped.map((group) => (
            <SelectGroup key={group.parent}>
              <SelectLabel className="font-sans text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {group.parent}
              </SelectLabel>
              {group.personas.map((persona) => (
                <SelectItem key={persona.id} value={persona.id} className="font-sans text-sm">
                  {persona.label}
                </SelectItem>
              ))}
            </SelectGroup>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default PersonaSelector;
