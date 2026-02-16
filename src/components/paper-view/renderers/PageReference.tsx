import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface PageReferenceProps {
  page: number;
}

export function PageReference({ page }: PageReferenceProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button className="text-xs font-mono text-accent hover:underline cursor-pointer">
            (p.&nbsp;{page})
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">View page {page} in PDF</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/** Replace all "(p. X)" patterns in a string with PageReference components */
export function renderWithPageRefs(text: string): React.ReactNode[] {
  const parts = text.split(/\(p\.\s*(\d+)\)/g);
  return parts.map((part, i) => {
    if (i % 2 === 1) {
      return <PageReference key={i} page={parseInt(part, 10)} />;
    }
    return part ? <span key={i}>{part}</span> : null;
  });
}
