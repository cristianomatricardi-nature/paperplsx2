import { useNavigate } from 'react-router-dom';
import { FileText, Trash2, RotateCcw, ExternalLink } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useRealtimePaper } from '@/hooks/useRealtimePaper';
import PipelineProgress from './PipelineProgress';
import type { Paper, PaperStatus, Author } from '@/types/database';
import { useEffect, useRef } from 'react';

interface PaperCardProps {
  paper: Paper;
  onDeleted: () => void;
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatAuthors(authors: Author[] | null): string {
  if (!authors || authors.length === 0) return 'Unknown authors';
  const names = authors.map((a) => a.name);
  if (names.length <= 3) return names.join(', ');
  return `${names.slice(0, 3).join(', ')} + ${names.length - 3} more`;
}

export default function PaperCard({ paper, onDeleted }: PaperCardProps) {
  const navigate = useNavigate();
  const { status: realtimeStatus, paper: realtimePaper } = useRealtimePaper(paper.id);
  const prevStatusRef = useRef<string | null>(paper.status);

  const currentStatus = (realtimeStatus ?? paper.status) as PaperStatus;
  const currentPaper = realtimePaper ? { ...paper, ...realtimePaper } : paper;
  const errorMessage = (currentPaper as any).error_message as string | null;

  // Toast on status change
  useEffect(() => {
    if (!realtimeStatus || realtimeStatus === prevStatusRef.current) return;
    prevStatusRef.current = realtimeStatus;

    if (realtimeStatus === 'completed') {
      toast({ title: 'Paper processed!', description: currentPaper.title || 'Your paper is ready.' });
    } else if (realtimeStatus === 'failed') {
      toast({ title: 'Processing failed', description: errorMessage || 'An error occurred.', variant: 'destructive' });
    }
  }, [realtimeStatus]);

  const handleDelete = async () => {
    const { error } = await supabase.from('papers').delete().eq('id', paper.id);
    if (error) {
      toast({ title: 'Delete failed', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Paper deleted' });
      onDeleted();
    }
  };

  const handleRetry = async () => {
    try {
      const { error } = await supabase.functions.invoke('orchestrate-pipeline', {
        body: { paper_id: paper.id },
      });
      if (error) throw error;
      toast({ title: 'Retrying processing…' });
    } catch (err: any) {
      toast({ title: 'Retry failed', description: err.message, variant: 'destructive' });
    }
  };

  const isCompleted = currentStatus === 'completed';
  const isFailed = currentStatus === 'failed';
  const isProcessing = !isCompleted && !isFailed && currentStatus !== 'uploaded';

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-md">
      <CardContent className="space-y-3 p-5">
        {/* Title */}
        <h3
          className={`font-serif text-base font-semibold leading-snug ${isCompleted ? 'cursor-pointer text-foreground hover:text-[hsl(var(--deep-blue))]' : 'text-foreground'}`}
          onClick={isCompleted ? () => navigate(`/paper/${paper.id}`) : undefined}
        >
          {currentPaper.title || 'Untitled Paper'}
        </h3>

        {/* Authors */}
        <p className="text-xs text-muted-foreground leading-relaxed">
          {formatAuthors(currentPaper.authors as Author[] | null)}
        </p>

        {/* Journal + Date row */}
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {currentPaper.journal && <span>{currentPaper.journal as string}</span>}
          {currentPaper.publication_date && (
            <>
              {currentPaper.journal && <span>·</span>}
              <span>{currentPaper.publication_date as string}</span>
            </>
          )}
          {currentPaper.doi && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              DOI
            </Badge>
          )}
          {currentPaper.file_size && (
            <span className="ml-auto text-[10px]">
              {formatFileSize(currentPaper.file_size as number | null)}
            </span>
          )}
        </div>

        {/* Pipeline progress */}
        {currentStatus !== 'uploaded' && (
          <PipelineProgress status={currentStatus} errorMessage={errorMessage} />
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1">
          {isCompleted && (
            <Button
              size="sm"
              className="bg-[hsl(var(--deep-blue))] hover:bg-[hsl(var(--deep-blue)/.85)] text-[hsl(var(--deep-blue-foreground))]"
              onClick={() => navigate(`/paper/${paper.id}`)}
            >
              <FileText className="mr-1 h-3.5 w-3.5" />
              View Paper++
            </Button>
          )}

          {isFailed && (
            <Button size="sm" variant="outline" onClick={handleRetry}>
              <RotateCcw className="mr-1 h-3.5 w-3.5" />
              Retry
            </Button>
          )}

          {isProcessing && (
            <Button size="sm" disabled>
              Processing…
            </Button>
          )}

          {currentPaper.doi && (
            <Button
              size="sm"
              variant="ghost"
              className="ml-auto"
              asChild
            >
              <a
                href={`https://doi.org/${currentPaper.doi}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </Button>
          )}

          {/* Delete with confirmation */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="icon" variant="ghost" className={`h-8 w-8 text-muted-foreground hover:text-destructive ${currentPaper.doi ? '' : 'ml-auto'}`}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Paper</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete "{currentPaper.title || 'this paper'}" and all associated data. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}
