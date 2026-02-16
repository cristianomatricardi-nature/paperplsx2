import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { MethodStep } from '@/types/structured-paper';
import type { RequirementStatus } from '@/components/replication/GapSummary';

export function useStructuredMethods(paperId: number | null) {
  return useQuery({
    queryKey: ['structured-methods', paperId],
    enabled: !!paperId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('structured_papers')
        .select('methods, metadata')
        .eq('paper_id', paperId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useLabInventory(userId: string | null) {
  return useQuery({
    queryKey: ['lab-inventory', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('digital_lab_inventory')
        .select('*')
        .eq('user_id', userId!);
      if (error) throw error;
      return data ?? [];
    },
  });
}

function fuzzyMatch(needle: string, haystack: string): 'exact' | 'partial' | 'none' {
  const a = needle.toLowerCase().trim();
  const b = haystack.toLowerCase().trim();
  if (a === b) return 'exact';
  if (b.includes(a) || a.includes(b)) return 'partial';
  // Check if any word (3+ chars) in the needle is found in haystack
  const words = a.split(/\s+/).filter(w => w.length >= 3);
  if (words.some(w => b.includes(w))) return 'partial';
  return 'none';
}

export function buildRequirements(
  method: MethodStep,
  inventory: { item_name: string; item_type: string; model_number: string | null }[]
): RequirementStatus[] {
  const reqs: RequirementStatus[] = [];

  const add = (items: string[] | undefined, type: RequirementStatus['type']) => {
    (items ?? []).forEach(item => {
      let bestMatch: { name: string; result: 'exact' | 'partial' } | null = null;
      for (const inv of inventory) {
        const result = fuzzyMatch(item, inv.item_name);
        if (result === 'exact') { bestMatch = { name: inv.item_name, result }; break; }
        if (result === 'partial' && !bestMatch) bestMatch = { name: inv.item_name, result };
      }
      reqs.push({
        name: item,
        type,
        paperSpecifies: item,
        labMatch: bestMatch?.name ?? null,
        status: bestMatch
          ? bestMatch.result === 'exact' ? 'available' : 'check'
          : 'missing',
      });
    });
  };

  add(method.tools, 'instrument');
  add(method.reagents, 'reagent');
  add(method.software, 'software');
  add(method.conditions, 'condition');

  return reqs;
}
