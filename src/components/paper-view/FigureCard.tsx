import { useState } from 'react';
import type { Figure } from '@/types/structured-paper';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';

interface FigureCardProps {
  figure: Figure;
}

const FigureCard = ({ figure }: FigureCardProps) => {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="group w-full text-left rounded-md border border-border bg-card shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden cursor-pointer">
          {/* Image area */}
          {figure.image_url ? (
            <div className="w-full aspect-video bg-muted/30 overflow-hidden">
              <img
                src={figure.image_url}
                alt={figure.caption}
                className="w-full h-full object-contain transition-transform duration-200 group-hover:scale-105"
                loading="lazy"
              />
            </div>
          ) : (
            <div className="w-full aspect-video bg-muted/40 flex items-center justify-center transition-transform duration-200 group-hover:scale-105">
              <span className="text-sm font-sans text-muted-foreground">
                📊 Figure from page {figure.page_number}
              </span>
            </div>
          )}

          {/* Content */}
          <div className="p-3 space-y-2">
            {/* Caption */}
            <p className="text-sm font-sans font-medium text-foreground line-clamp-2 leading-snug">
              {figure.caption}
            </p>

            {/* Badges row */}
            <div className="flex flex-wrap gap-1.5">
              {figure.figure_type && (
                <Badge variant="secondary" className="text-[10px] font-sans">
                  {figure.figure_type}
                </Badge>
              )}
              <Badge variant="outline" className="text-[10px] font-sans font-mono">
                Page {figure.page_number}
              </Badge>
            </div>

            {/* Key findings */}
            {figure.key_findings?.length > 0 && (
              <ul className="text-xs font-sans text-muted-foreground list-disc list-inside space-y-0.5">
                {figure.key_findings.slice(0, 3).map((kf, i) => (
                  <li key={i} className="leading-relaxed">{kf}</li>
                ))}
                {figure.key_findings.length > 3 && (
                  <li className="text-accent">+{figure.key_findings.length - 3} more…</li>
                )}
              </ul>
            )}
          </div>
        </button>
      </DialogTrigger>

      {/* Full-size modal */}
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 gap-0 bg-card">
        {/* Image */}
        <div className="bg-muted/20 p-4">
          {figure.image_url ? (
            <img
              src={figure.image_url}
              alt={figure.caption}
              className="w-full h-auto max-h-[60vh] object-contain rounded-md"
            />
          ) : (
            <div className="flex items-center justify-center h-48 bg-muted rounded-md text-muted-foreground">
              No image available
            </div>
          )}
        </div>

        {/* Metadata */}
        <div className="p-5 space-y-3">
          <p className="font-serif text-base font-semibold text-foreground">{figure.caption}</p>

          <div className="flex flex-wrap gap-1.5">
            {figure.figure_type && (
              <Badge variant="secondary" className="text-xs font-sans">
                {figure.figure_type}
              </Badge>
            )}
            <Badge variant="outline" className="text-xs font-sans font-mono">
              Page {figure.page_number}
            </Badge>
          </div>

          {figure.description && (
            <p className="text-sm font-sans text-muted-foreground leading-relaxed">
              {figure.description}
            </p>
          )}

          {figure.key_findings?.length > 0 && (
            <div>
              <h4 className="text-xs font-sans font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                Key Findings
              </h4>
              <ul className="text-sm font-sans text-foreground list-disc list-inside space-y-1">
                {figure.key_findings.map((kf, i) => (
                  <li key={i} className="leading-relaxed">{kf}</li>
                ))}
              </ul>
            </div>
          )}

          {figure.data_series?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {figure.data_series.map((ds, i) => (
                <Badge key={i} variant="outline" className="text-[10px] font-sans">
                  {ds}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FigureCard;
