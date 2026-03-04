import { useMemo } from 'react';

export interface AudioSection {
  id: string;
  label: string;
  start_ms: number;
  end_ms: number;
}

interface SectionProgressStripProps {
  sections: AudioSection[];
  currentTime: number; // seconds
  onSeek: (time: number) => void;
}

const SECTION_ORDER = ['what', 'why', 'how', 'what_can_i_do'];
const SECTION_LABELS: Record<string, string> = {
  what: 'What',
  why: 'Why',
  how: 'How',
  what_can_i_do: 'Do',
};

const SectionProgressStrip = ({ sections, currentTime, onSeek }: SectionProgressStripProps) => {
  const orderedSections = useMemo(() => {
    if (!sections?.length) return [];
    return SECTION_ORDER
      .map(id => sections.find(s => s.id === id))
      .filter(Boolean) as AudioSection[];
  }, [sections]);

  if (!orderedSections.length) return null;

  const currentMs = currentTime * 1000;

  return (
    <div className="flex gap-1.5 mt-1.5">
      {orderedSections.map((section) => {
        const duration = section.end_ms - section.start_ms;
        const elapsed = Math.max(0, Math.min(duration, currentMs - section.start_ms));
        const progress = duration > 0 ? (elapsed / duration) * 100 : 0;
        const isActive = currentMs >= section.start_ms && currentMs < section.end_ms;
        const isComplete = currentMs >= section.end_ms;

        return (
          <button
            key={section.id}
            className="flex-1 group text-left"
            onClick={() => onSeek(section.start_ms / 1000)}
            title={`Jump to: ${SECTION_LABELS[section.id] || section.label}`}
          >
            {/* Progress bar */}
            <div className="h-1.5 rounded-full bg-muted overflow-hidden mb-1">
              <div
                className={`h-full rounded-full transition-all duration-200 ${
                  isComplete ? 'bg-primary' : isActive ? 'bg-primary' : 'bg-transparent'
                }`}
                style={{ width: `${isComplete ? 100 : progress}%` }}
              />
            </div>
            {/* Label */}
            <span
              className={`text-[10px] font-sans leading-none transition-colors ${
                isActive
                  ? 'text-primary font-semibold'
                  : isComplete
                    ? 'text-primary/70 font-medium'
                    : 'text-muted-foreground'
              } group-hover:text-primary`}
            >
              {SECTION_LABELS[section.id] || section.label}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default SectionProgressStrip;
