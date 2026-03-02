import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { FileText, Image, Table2, AlertTriangle } from 'lucide-react';
import type { FunderEvidenceRef, FunderAim, FunderKeyFinding } from '@/hooks/useFunderView';

interface EvidenceDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  evidenceRef: FunderEvidenceRef | null;
  /** All aims/findings that cite this evidence */
  citingClaims: Array<{ type: 'aim' | 'finding'; label: string }>;
}

const typeIcons: Record<string, React.ReactNode> = {
  figure: <Image className="h-4 w-4" />,
  table: <Table2 className="h-4 w-4" />,
  text: <FileText className="h-4 w-4" />,
};

const EvidenceDrawer = ({ open, onOpenChange, evidenceRef, citingClaims }: EvidenceDrawerProps) => {
  if (!evidenceRef) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 font-sans text-base">
            {typeIcons[evidenceRef.type] ?? <FileText className="h-4 w-4" />}
            {evidenceRef.label}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-5 mt-4">
          {/* Type badge */}
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="capitalize text-xs">{evidenceRef.type}</Badge>
            <span className="text-xs text-muted-foreground">Section: {evidenceRef.section}</span>
          </div>

          {/* Snippet */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
              Caption / Excerpt
            </h4>
            <p className="text-sm font-sans leading-relaxed text-foreground bg-muted/40 rounded-md p-3">
              {evidenceRef.caption_or_excerpt || 'No caption available.'}
            </p>
          </div>

          {/* Anchor link */}
          {evidenceRef.url_or_anchor && (
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                Location
              </h4>
              <p className="text-sm text-primary font-mono">{evidenceRef.url_or_anchor}</p>
            </div>
          )}

          {/* Citing claims */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Referenced by
            </h4>
            {citingClaims.length > 0 ? (
              <ul className="space-y-1.5">
                {citingClaims.map((c, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <Badge variant="secondary" className="text-[10px] capitalize">{c.type}</Badge>
                    <span className="text-foreground">{c.label}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex items-center gap-1.5 text-xs text-amber-600">
                <AlertTriangle className="h-3.5 w-3.5" />
                No claims reference this evidence
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default EvidenceDrawer;
