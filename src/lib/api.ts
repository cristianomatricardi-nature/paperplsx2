import { supabase } from '@/integrations/supabase/client';

export async function uploadPaper(file: File, userId: string) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('user_id', userId);

  const { data, error } = await supabase.functions.invoke('upload-handler', { body: formData });
  if (error) throw error;
  return data;
}

export async function resolveDOI(doi: string, userId: string) {
  const { data, error } = await supabase.functions.invoke('doi-resolver', {
    body: { doi, user_id: userId },
  });
  if (error) throw error;
  return data;
}

export async function fetchSummary(paperId: number, subPersonaId: string, userId?: string) {
  const body: Record<string, unknown> = { paper_id: paperId, sub_persona_id: subPersonaId };
  if (userId) body.user_id = userId;
  const { data, error } = await supabase.functions.invoke('generate-summary', { body });
  if (error) throw error;
  return data;
}

export async function fetchModuleContent(paperId: number, moduleId: string, subPersonaId: string) {
  const { data, error } = await supabase.functions.invoke('generate-module-content', {
    body: { paper_id: paperId, module_id: moduleId, sub_persona_id: subPersonaId },
  });
  if (error) throw error;
  return data;
}

export async function explainMetric(paperId: number, query: string) {
  const { data, error } = await supabase.functions.invoke('explain-metric', {
    body: { paper_id: paperId, query },
  });
  if (error) throw error;
  return data;
}

export async function downloadPaperPDF(storagePath: string) {
  const { data, error } = await supabase.storage.from('research-papers').createSignedUrl(storagePath, 3600);
  if (error) throw error;
  return data.signedUrl;
}

async function longRunningInvoke(functionName: string, body: Record<string, unknown>, timeoutMs = 120_000) {
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${functionName}`;
  const { data: { session } } = await supabase.auth.getSession();
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      'Authorization': `Bearer ${session?.access_token}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) throw new Error(`Edge function error: ${response.status}`);
  return response.json();
}

export async function fetchPolicyView(paperId: number, subPersonaId: string) {
  return longRunningInvoke('generate-policy-view', { paper_id: paperId, sub_persona_id: subPersonaId });
}

export async function generatePolicyInfographic(
  paperId: number,
  paperTitle: string,
  infographicSpec: { title: string; sections: string[]; key_visual_description: string },
  subPersonaId?: string,
) {
  // Fire: start job (returns immediately with job_id)
  const { data, error } = await supabase.functions.invoke('generate-policy-infographic', {
    body: {
      paper_id: paperId,
      paper_title: paperTitle,
      infographic_spec: infographicSpec,
      sub_persona_id: subPersonaId,
    },
  });
  if (error) throw error;
  if (!data?.job_id) throw new Error('Failed to start infographic job');

  // Poll: wait for completion
  return pollInfographicJob(data.job_id);
}

async function pollInfographicJob(jobId: string, maxAttempts = 120): Promise<any> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const { data, error } = await supabase
      .from('infographic_jobs' as any)
      .select('*')
      .eq('id', jobId)
      .single();

    if (error) throw error;
    if (!data) throw new Error('Job not found');

    const job = data as any;

    if (job.status === 'complete') {
      return {
        success: true,
        policy_relevant: true,
        policy_relevance_score: job.policy_relevance_score,
        image_url: job.image_url,
        debug: job.debug,
      };
    }
    if (job.status === 'not_relevant') {
      return {
        success: true,
        policy_relevant: false,
        policy_relevance_score: job.policy_relevance_score,
        reason: job.reason,
        debug: job.debug,
      };
    }
    if (job.status === 'failed') {
      throw new Error(job.error || 'Infographic generation failed');
    }

    // Still processing — wait 3s
    await new Promise(r => setTimeout(r, 3000));
  }
  throw new Error('Infographic generation timed out');
}

export async function matchPolicyContent(
  paperId: number,
  subPersonaId: string,
  policyDraftText: string,
) {
  const { data, error } = await supabase.functions.invoke('match-policy-content', {
    body: { paper_id: paperId, sub_persona_id: subPersonaId, policy_draft_text: policyDraftText },
  });
  if (error) throw error;
  return data;
}

export async function fetchFunderView(paperId: number, subPersonaId: string) {
  return longRunningInvoke('generate-funder-view', { paper_id: paperId, sub_persona_id: subPersonaId });
}

export async function fetchEducatorView(paperId: number, subPersonaId: string) {
  return longRunningInvoke('generate-educator-view', { paper_id: paperId, sub_persona_id: subPersonaId });
}

export async function generateAudioHook(paperId: number, subPersonaId: string) {
  const { data, error } = await supabase.functions.invoke('generate-audio-hook', {
    body: { paper_id: paperId, sub_persona_id: subPersonaId },
  });
  if (error) throw error;
  return data;
}

export async function pollAudioHookJob(jobId: string, maxAttempts = 60): Promise<any> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const { data, error } = await supabase
      .from('audio_hook_jobs' as any)
      .select('*')
      .eq('id', jobId)
      .single();

    if (error) throw error;
    if (!data) throw new Error('Job not found');

    const job = data as any;
    if (job.status === 'complete') {
      return { status: 'complete', audio_url: job.audio_url, script: job.script, call_to_actions: job.call_to_actions, sections: job.sections, timestamps: job.timestamps };
    }
    if (job.status === 'failed') {
      throw new Error(job.error || 'Audio hook generation failed');
    }

    await new Promise(r => setTimeout(r, 2000));
  }
  throw new Error('Audio hook generation timed out');
}
