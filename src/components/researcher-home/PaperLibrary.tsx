import { useEffect, useState, useCallback } from 'react';
import { FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import PaperCard from './PaperCard';
import type { Paper } from '@/types/database';

interface PaperLibraryProps {
  userId: string;
  refreshKey: number;
}

export default function PaperLibrary({ userId, refreshKey }: PaperLibraryProps) {
  const [papers, setPapers] = useState<Paper[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <section>
      <div className="mb-4 flex items-center gap-2">
        <h2 className="text-xl font-semibold font-serif text-foreground">My Papers</h2>
        {!loading && (
          <Badge variant="secondary" className="text-xs">
            {papers.length}
          </Badge>
        )}
      </div>

      {loading ? (
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
      ) : papers.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/20 py-16 text-center">
          <FileText className="mb-4 h-12 w-12 text-muted-foreground/40" />
          <p className="text-sm font-medium text-muted-foreground">No papers yet</p>
          <p className="mt-1 text-xs text-muted-foreground/70">
            Upload your first PDF or paste a DOI to get started!
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {papers.map((paper) => (
            <PaperCard key={paper.id} paper={paper} onDeleted={handleDeleted} />
          ))}
        </div>
      )}
    </section>
  );
}
