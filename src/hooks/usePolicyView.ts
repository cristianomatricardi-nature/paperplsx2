import { useState, useEffect, useRef } from 'react';
import { fetchPolicyView } from '@/lib/api';

export interface PolicyViewPayload {
  executive_strip: {
    relevance_score: number;
    relevance_reasoning: string;
    confidence_level: 'high' | 'medium' | 'low';
    top_finding: string;
  };
  policy_tags: {
    policy_areas: string[];
    policy_relevance_score: number;
    policy_relevance_reasoning: string;
    suggested_policy_contexts: Array<{
      context: string;
      relevance: string;
    }>;
  };
  policy_brief: {
    evidence_quality: 'Strong' | 'Moderate' | 'Preliminary';
    key_claims_summary: string[];
    recommended_actions: string[];
    full_brief_text: string;
  };
  infographic_spec: {
    title: string;
    sections: string[];
    key_visual_description: string;
  };
}

interface UsePolicyViewResult {
  payload: PolicyViewPayload | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function usePolicyView(paperId: number | null, subPersonaId: string): UsePolicyViewResult {
  const [payload, setPayload] = useState<PolicyViewPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchKey = useRef<string>('');

  const load = async () => {
    if (!paperId || !subPersonaId) return;
    const key = `${paperId}__${subPersonaId}`;
    fetchKey.current = key;

    setLoading(true);
    setError(null);
    setPayload(null);

    try {
      const result = await fetchPolicyView(paperId, subPersonaId);
      // Guard against stale responses if persona changed mid-flight
      if (fetchKey.current !== key) return;
      if (result?.content) {
        setPayload(result.content as PolicyViewPayload);
      } else if (result?.success === false) {
        setError(result.error ?? 'Failed to generate policy view');
      }
    } catch (err) {
      if (fetchKey.current !== key) return;
      setError(err instanceof Error ? err.message : 'Failed to load policy view');
    } finally {
      if (fetchKey.current === key) setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paperId, subPersonaId]);

  return { payload, loading, error, refetch: load };
}
