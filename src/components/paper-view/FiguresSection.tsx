import type { Figure } from '@/types/structured-paper';
import FigureCard from './FigureCard';

interface FiguresSectionProps {
  figures: Figure[];
  paperId: number;
}

const FiguresSection = ({ figures, paperId }: FiguresSectionProps) => {
  if (!figures || figures.length === 0) return null;

  return (
    <section className="space-y-4">
      <h2 className="font-serif text-lg font-semibold text-foreground">
        Figures &amp; Visual Elements
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {figures.map((fig) => (
          <FigureCard key={fig.id} figure={fig} paperId={paperId} />
        ))}
      </div>
    </section>
  );
};

export default FiguresSection;
