import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Download, Eye, ExternalLink, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { downloadPaperPDF } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { Author } from '@/types/database';

interface PaperHeaderProps {
  title: string | null;
  authors: Author[] | null;
  journal: string | null;
  publicationDate: string | null;
  doi: string | null;
  storagePath: string | null;
  isOpenAccess?: boolean;
  isOwner?: boolean;
  authorsMode?: boolean;
  onAuthorsModeChange?: (v: boolean) => void;
  paperId?: number | null;
}

const PaperHeader = ({
  title,
  authors,
  journal,
  publicationDate,
  doi,
  storagePath,
  isOpenAccess = false,
}: PaperHeaderProps) => {
  const { toast } = useToast();
  const [showAllAuthors, setShowAllAuthors] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // Random "viewing now" count for prototype
  const viewingNow = useState(() => Math.floor(Math.random() * 14) + 2)[0];

  const displayedAuthors = authors ?? [];
  const visibleAuthors = showAllAuthors ? displayedAuthors : displayedAuthors.slice(0, 5);
  const hiddenCount = displayedAuthors.length - 5;

  const handleDownload = async () => {
    if (!storagePath) return;
    setDownloading(true);
    try {
      const url = await downloadPaperPDF(storagePath);
      window.open(url, '_blank');
    } catch {
      toast({ title: 'Download failed', description: 'Could not generate download link.', variant: 'destructive' });
    } finally {
      setDownloading(false);
    }
  };

  const formattedDate = publicationDate
    ? new Date(publicationDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : null;

  return (
    <header className="border-b border-border pb-8 mb-8">
      {/* Meta line */}
      <div className="flex flex-wrap items-center gap-2 mb-3 text-sm font-sans text-muted-foreground">
        <span className="font-medium text-foreground">Article</span>
        {journal && <><span className="text-primary font-medium">Open access</span></>}
        {formattedDate && <span>Published: {formattedDate}</span>}
      </div>

      {/* Title */}
      <h1 className="font-sans text-[1.75rem] md:text-[2rem] lg:text-[2.25rem] font-bold text-foreground leading-[1.2] mb-5">
        {title ?? 'Untitled Paper'}
      </h1>

      {/* Authors */}
      {displayedAuthors.length > 0 && (
        <div className="mb-5">
          <div className="flex flex-wrap items-center gap-1.5">
            {visibleAuthors.map((author, i) => (
              <Tooltip key={i}>
                <TooltipTrigger asChild>
                  <span className="inline-flex items-center gap-1.5 font-sans text-base">
                    <span className="text-foreground">
                      {author.name}
                      {i < visibleAuthors.length - 1 && ','}
                    </span>
                  </span>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="font-sans text-xs bg-popover">
                  <p className="font-semibold">{author.name}</p>
                  {author.affiliation && <p className="text-muted-foreground">{author.affiliation}</p>}
                </TooltipContent>
              </Tooltip>
            ))}
            {!showAllAuthors && hiddenCount > 0 && (
              <button
                onClick={() => setShowAllAuthors(true)}
                className="inline-flex items-center gap-0.5 text-base font-sans text-[hsl(var(--deep-blue))] hover:underline"
              >
                +{hiddenCount} more
                <ChevronDown className="h-3 w-3" />
              </button>
            )}
            {showAllAuthors && hiddenCount > 0 && (
              <button
                onClick={() => setShowAllAuthors(false)}
                className="inline-flex items-center gap-0.5 text-base font-sans text-[hsl(var(--deep-blue))] hover:underline"
              >
                Show less
                <ChevronUp className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Actions row */}
      <div className="flex flex-wrap items-center gap-3">
        {storagePath && (
          <Button
            variant="outline"
            size="sm"
            className="font-sans gap-1.5 border-[hsl(var(--deep-blue))] text-[hsl(var(--deep-blue))] hover:bg-[hsl(var(--deep-blue))]/10"
            onClick={handleDownload}
            disabled={downloading}
          >
            <Download className="h-4 w-4" />
            {downloading ? 'Preparing…' : 'Download PDF'}
          </Button>
        )}

        <div className="flex items-center gap-1 text-sm font-sans text-muted-foreground ml-auto">
          <Eye className="h-4 w-4" />
          <span>{viewingNow} viewing now</span>
        </div>
      </div>
    </header>
  );
};

export default PaperHeader;
