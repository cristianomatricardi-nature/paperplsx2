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

export async function fetchSummary(paperId: number, subPersonaId: string) {
  const { data, error } = await supabase.functions.invoke('generate-summary', {
    body: { paper_id: paperId, sub_persona_id: subPersonaId },
  });
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

export async function fetchPolicyView(paperId: number, subPersonaId: string) {
  const { data, error } = await supabase.functions.invoke('generate-policy-view', {
    body: { paper_id: paperId, sub_persona_id: subPersonaId },
  });
  if (error) throw error;
  return data;
}

export async function generatePolicyInfographic(
  paperId: number,
  paperTitle: string,
  infographicSpec: { title: string; sections: string[]; key_visual_description: string },
) {
  const { data, error } = await supabase.functions.invoke('generate-policy-infographic', {
    body: { paper_id: paperId, paper_title: paperTitle, infographic_spec: infographicSpec },
  });
  if (error) throw error;
  return data;
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
