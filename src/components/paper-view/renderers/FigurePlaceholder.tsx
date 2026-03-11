import { useState } from 'react';
import type { Figure } from '@/types/structured-paper';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';

interface FigurePlaceholderProps {
  figure: Figure;
}

export function FigurePlaceholder({ figure }: FigurePlaceholderProps) {
  const [open, setOpen] = useState(false);

  const hasSubPanels = figure.sub_panels && figure.sub_panels.length > 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="w-full text-left rounded-md border border-border bg-muted/30 p-3 hover:bg-muted/50 transition-colors cursor-pointer">
          {figure.image_url ? (
            <img
              src={figure.image_url}
              alt={figure.caption}
              className="w-full h-auto rounded-sm"
              loading="lazy"
            />
          ) : hasSubPanels ? (
            <div className={`grid gap-2 ${figure.sub_panels!.length <= 2 ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-3'}`}>
              {figure.sub_panels!.map((panel) => (
                <div key={panel.panel_id} className="space-y-1">
                  {panel.image_url ? (
                    <img
                      src={panel.image_url}
                      alt={`${figure.caption} (${panel.label})`}
                      className="w-full h-auto rounded-sm"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-24 rounded-sm bg-muted text-muted-foreground text-xs">
                      Panel {panel.label}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">{panel.label}: {panel.description}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-32 rounded-sm bg-muted text-muted-foreground text-sm">
              📊 {figure.caption || `Figure ${figure.id}`}
            </div>
          )}
          <p className="text-sm font-medium text-foreground mt-2">{figure.caption}</p>
          {figure.visual_description && (
            <p className="text-xs text-muted-foreground mt-1 italic">{figure.visual_description}</p>
          )}
          {figure.key_findings?.length > 0 && (
            <ul className="text-xs text-muted-foreground mt-1 list-disc list-inside">
              {figure.key_findings.map((kf, i) => (
                <li key={i}>{kf}</li>
              ))}
            </ul>
          )}
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        {figure.image_url ? (
          <img src={figure.image_url} alt={figure.caption} className="w-full h-auto rounded-md" />
        ) : hasSubPanels ? (
          <div className={`grid gap-3 ${figure.sub_panels!.length <= 2 ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-3'}`}>
            {figure.sub_panels!.map((panel) => (
              <div key={panel.panel_id} className="space-y-1">
                {panel.image_url ? (
                  <img
                    src={panel.image_url}
                    alt={`${figure.caption} (${panel.label})`}
                    className="w-full h-auto rounded-md"
                  />
                ) : (
                  <div className="flex items-center justify-center h-32 bg-muted rounded-md text-muted-foreground">
                    Panel {panel.label}
                  </div>
                )}
                <p className="text-xs font-medium">{panel.label}: {panel.description}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-48 bg-muted rounded-md text-muted-foreground">
            No image available
          </div>
        )}
        <p className="text-sm font-medium mt-2">{figure.caption}</p>
        {figure.visual_description && (
          <p className="text-xs text-muted-foreground mt-1 italic">{figure.visual_description}</p>
        )}
        {figure.description && <p className="text-xs text-muted-foreground mt-1">{figure.description}</p>}
      </DialogContent>
    </Dialog>
  );
}
