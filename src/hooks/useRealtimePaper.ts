import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useRealtimePaper(paperId: number | null) {
  const [status, setStatus] = useState<string | null>(null);
  const [paper, setPaper] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    if (!paperId) return;

    // Fetch initial state
    supabase
      .from('papers')
      .select('*')
      .eq('id', paperId)
      .single()
      .then(({ data }) => {
        if (data) {
          setPaper(data as Record<string, unknown>);
          setStatus(data.status);
        }
      });

    // Subscribe to realtime changes
    const channel = supabase
      .channel(`paper-${paperId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'papers',
          filter: `id=eq.${paperId}`,
        },
        (payload) => {
          const newRecord = payload.new as Record<string, unknown>;
          setPaper(newRecord);
          setStatus(newRecord.status as string);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [paperId]);

  return { paper, status };
}