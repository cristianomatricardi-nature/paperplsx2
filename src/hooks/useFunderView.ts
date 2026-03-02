import { useState, useEffect, useRef } from 'react';
import { fetchFunderView } from '@/lib/api';

export interface FunderAim {
  id: string;
  statement: string;
  planned_endpoint: string;
  status: 'met' | 'partial' | 'not_met' | 'inconclusive' | 'not_addressed';
  outcome_summary: string;
  effect_size_text: string | null;
  uncertainty_text: string | null;
  confidence: 'high' | 'medium' | 'low';
  confidence_rationale: string[];
  evidence_refs: string[];
}

export interface FunderKeyFinding {
  id: string;
  finding: string;
  effect_size_text: string | null;
  uncertainty_text: string | null;
  population_or_model: string;
  conditions: string;
  confidence: 'high' | 'medium' | 'low';
  evidence_refs: string[];
}

export interface FunderEvidenceRef {
  id: string;
  type: 'figure' | 'table' | 'text';
  label: string;
  caption_or_excerpt: string;
  section: string;
  url_or_anchor: string | null;
}

export interface FunderOutput {
  name: string;
  link: string | null;
  license: string;
  access: 'open' | 'restricted' | 'unavailable';
}

export interface FunderNextStep {
  step: string;
  gating_evidence: string;
  dependency: string;
  scale_hint: string;
}

export interface FunderViewPayload {
  metadata: {
    title: string;
    authors: string[];
    journal: string | null;
    year: string | null;
    doi: string | null;
    funders: string[];
    grant_ids: string[];
  };
  aims: FunderAim[];
  key_findings: FunderKeyFinding[];
  evidence_refs: FunderEvidenceRef[];
  outputs: {
    data: FunderOutput[];
    code: FunderOutput[];
    protocols: FunderOutput[];
    materials: FunderOutput[];
  };
  limitations: string[];
  next_steps: FunderNextStep[];
  compliance: {
    oa_status: string;
    data_availability: string;
    code_availability: string;
    ethics: string;
    coi: string;
  };
  disclaimer: string;
}

interface UseFunderViewResult {
  payload: FunderViewPayload | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useFunderView(paperId: number | null, subPersonaId: string): UseFunderViewResult {
  const [payload, setPayload] = useState<FunderViewPayload | null>(null);
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
      const result = await fetchFunderView(paperId, subPersonaId);
      if (fetchKey.current !== key) return;
      if (result?.content) {
        setPayload(result.content as FunderViewPayload);
      } else if (result?.success === false) {
        setError(result.error ?? 'Failed to generate funder view');
      }
    } catch (err) {
      if (fetchKey.current !== key) return;
      setError(err instanceof Error ? err.message : 'Failed to load funder view');
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
