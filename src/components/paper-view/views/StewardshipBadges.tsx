import { Badge } from '@/components/ui/badge';
import { Unlock, Lock, ShieldCheck, AlertCircle, HelpCircle } from 'lucide-react';

interface StewardshipBadgesProps {
  compliance: {
    oa_status: string;
    data_availability: string;
    code_availability: string;
    ethics: string;
    coi: string;
  };
}

const badgeItem = (label: string, value: string) => {
  const isPositive = ['open', 'gold', 'green', 'hybrid', 'approved', 'none_declared', 'exempt'].includes(value);
  const isNeutral = ['not_stated', 'unknown'].includes(value);

  return (
    <div className="flex items-center gap-1.5" key={label}>
      {isPositive ? (
        <Unlock className="h-3.5 w-3.5 text-emerald-600" />
      ) : isNeutral ? (
        <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
      ) : (
        <Lock className="h-3.5 w-3.5 text-amber-600" />
      )}
      <span className="text-xs font-sans text-muted-foreground">{label}:</span>
      <Badge
        variant="outline"
        className={`text-[10px] capitalize ${
          isPositive
            ? 'border-emerald-200 text-emerald-700'
            : isNeutral
              ? 'border-border text-muted-foreground'
              : 'border-amber-200 text-amber-700'
        }`}
      >
        {value.replace(/_/g, ' ')}
      </Badge>
    </div>
  );
};

const StewardshipBadges = ({ compliance }: StewardshipBadgesProps) => {
  if (!compliance) return null;

  return (
    <div>
      <h3 className="text-sm font-semibold font-sans text-foreground mb-3 uppercase tracking-wide">
        Stewardship
      </h3>
      <div className="flex flex-wrap gap-3">
        {badgeItem('Open Access', compliance.oa_status)}
        {badgeItem('Data', compliance.data_availability)}
        {badgeItem('Code', compliance.code_availability)}
        {badgeItem('Ethics', compliance.ethics)}
        {badgeItem('COI', compliance.coi)}
      </div>
    </div>
  );
};

export default StewardshipBadges;
