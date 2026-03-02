import { useState, useEffect, useRef } from 'react';
import { fetchEducatorView } from '@/lib/api';

export interface LearningObjective {
  objective: string;
  bloom_level: 'remember' | 'understand' | 'apply' | 'analyze' | 'evaluate' | 'create';
  source_module: string;
}

export interface KeyConcept {
  term: string;
  definition: string;
  analogy: string;
}

export interface DiscussionQuestion {
  question: string;
  suggested_answer_points: string[];
  difficulty: 'introductory' | 'intermediate' | 'advanced';
}

export interface ClassroomActivity {
  title: string;
  description: string;
  duration: string;
  materials: string[];
  learning_outcome: string;
}

export interface Misconception {
  misconception: string;
  correction: string;
  evidence_ref: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correct: number;
  explanation: string;
}

export interface FurtherReading {
  title: string;
  type: 'article' | 'video' | 'simulation' | 'textbook' | 'website';
  url_or_description: string;
  level: 'beginner' | 'intermediate' | 'advanced';
}

export interface EducatorViewPayload {
  learning_objectives: LearningObjective[];
  simplified_explanation: {
    summary: string;
    key_concepts: KeyConcept[];
    prerequisite_knowledge: string[];
  };
  discussion_questions: DiscussionQuestion[];
  classroom_activities: ClassroomActivity[];
  misconceptions: Misconception[];
  assessment: {
    quiz_questions: QuizQuestion[];
  };
  further_reading: FurtherReading[];
}

interface UseEducatorViewResult {
  payload: EducatorViewPayload | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useEducatorView(paperId: number | null, subPersonaId: string): UseEducatorViewResult {
  const [payload, setPayload] = useState<EducatorViewPayload | null>(null);
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
      const result = await fetchEducatorView(paperId, subPersonaId);
      if (fetchKey.current !== key) return;
      if (result?.content) {
        setPayload(result.content as EducatorViewPayload);
      } else if (result?.success === false) {
        setError(result.error ?? 'Failed to generate educator view');
      }
    } catch (err) {
      if (fetchKey.current !== key) return;
      setError(err instanceof Error ? err.message : 'Failed to load educator view');
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
