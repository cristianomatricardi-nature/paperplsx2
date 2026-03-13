import { useEffect, useState, useCallback, useRef } from 'react';
import { FileText, BookOpen, Sparkles, Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import PaperCard from './PaperCard';
import type { Paper } from '@/types/database';

interface PaperLibraryProps {
  userId: string;
  refreshKey: number;
}

const MAX_SIZE = 20 * 1024 * 1024;

export default function PaperLibrary({ userId, refreshKey }: PaperLibraryProps) {
  const [papers, setPapers] = useState<Paper[]>([]);
  const [loading, setLoading] = useState(true);
  const [libraryUploading, setLibraryUploading] = useState(false);
  const libraryFileInputRef = useRef<HTMLInputElement>(null);

  const fetchPapers = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('papers')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setPapers(data as unknown as Paper[]);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchPapers();
  }, [fetchPapers, refreshKey]);

  const handleDeleted = useCallback(() => {
    fetchPapers();
  }, [fetchPapers]);

  const libraryPapers = papers.filter((p) => p.source_type === 'library');
  const paperPlusPapers = papers.filter((p) => p.source_type !== 'library');

  const handleLibraryUpload = async (file: File) => {
    if (file.type !== 'application/pdf') {
      toast({ title: 'Invalid file', description: 'Only PDF files are accepted.', variant: 'destructive' });
      return;
    }
    if (file.size > MAX_SIZE) {
      toast({ title: 'File too large', description: 'Maximum file size is 20 MB.', variant: 'destructive' });
      return;
    }

    setLibraryUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('user_id', userId);
      formData.append('source_type', 'library');

      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upload-handler`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: formData,
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');

      const newPaperId = data?.paper_id;
      if (newPaperId) {
        supabase.functions.invoke('orchestrate-pipeline', {
          body: { paper_id: newPaperId, library_only: true },
        }).then(() => {});

        supabase.from('user_activity_events').insert({
          user_id: userId,
          paper_id: newPaperId,
          event_type: 'library_paper_uploaded',
        }).select().then(() => {});

        toast({ title: 'Added to library', description: 'Your paper is being parsed for context.' });
        fetchPapers();
      }
    } catch (err: any) {
      toast({ title: 'Upload failed', description: err.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setLibraryUploading(false);
    }
  };

  const renderEmptyState = (type: 'library' | 'paperpp') => (
    <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/20 py-12 text-center">
      {type === 'library' ? (
        <BookOpen className="mb-3 h-10 w-10 text-muted-foreground/40" />
      ) : (
        <FileText className="mb-3 h-10 w-10 text-muted-foreground/40" />
      )}
      <p className="text-sm font-medium text-muted-foreground">
        {type === 'library' ? 'No papers in your library yet' : 'No Paper++ generated yet'}
      </p>
      <p className="mt-1 text-xs text-muted-foreground/70">
        {type === 'library'
          ? 'Upload your own papers to build context for personalized analysis.'
          : 'Use the Paper++ Generator above to transform a paper.'}
      </p>
    </div>
  );

  const renderSkeleton = () => (
    <div className="grid gap-4 sm:grid-cols-2">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="space-y-3 rounded-lg border p-5">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-8 w-24" />
        </div>
      ))}
    </div>
  );

  return (
    <section>
      <div className="mb-4 flex items-center gap-2">
        <h2 className="text-xl font-semibold font-serif text-foreground">My Library</h2>
        {!loading && (
          <Badge variant="secondary" className="text-xs">
            {papers.length}
          </Badge>
        )}
      </div>

      <Tabs defaultValue="my-papers" className="w-full">
        <TabsList>
          <TabsTrigger value="my-papers" className="gap-1.5">
            <BookOpen className="h-3.5 w-3.5" />
            My Papers
            {!loading && (
              <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">
                {libraryPapers.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="paper-collection" className="gap-1.5">
            <Sparkles className="h-3.5 w-3.5" />
            Paper++ Collection
            {!loading && (
              <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">
                {paperPlusPapers.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* My Papers Tab */}
        <TabsContent value="my-papers" className="space-y-4">
          {/* Library upload dropzone */}
          <div
            role="button"
            tabIndex={0}
            className="flex items-center justify-center gap-3 rounded-md border-2 border-dashed border-border hover:border-muted-foreground/40 px-6 py-6 transition-colors cursor-pointer"
            onClick={() => libraryFileInputRef.current?.click()}
            onKeyDown={(e) => e.key === 'Enter' && libraryFileInputRef.current?.click()}
          >
            <Upload className="h-5 w-5 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {libraryUploading ? 'Uploading…' : 'Add a paper to your library'}
            </p>
            <input
              ref={libraryFileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              disabled={libraryUploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleLibraryUpload(file);
                e.target.value = '';
              }}
            />
          </div>

          {loading ? (
            renderSkeleton()
          ) : libraryPapers.length === 0 ? (
            renderEmptyState('library')
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {libraryPapers.map((paper) => (
                <PaperCard key={paper.id} paper={paper} onDeleted={handleDeleted} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Paper++ Collection Tab */}
        <TabsContent value="paper-collection">
          {loading ? (
            renderSkeleton()
          ) : paperPlusPapers.length === 0 ? (
            renderEmptyState('paperpp')
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {paperPlusPapers.map((paper) => (
                <PaperCard key={paper.id} paper={paper} onDeleted={handleDeleted} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </section>
  );
}
