import { ModuleId, SubPersonaId, MODULE_REGISTRY, SUB_PERSONA_REGISTRY } from '@/types/modules';

export { MODULE_REGISTRY, SUB_PERSONA_REGISTRY };

export const APP_NAME = 'Paper++';
export const APP_DESCRIPTION = 'Transform static scientific PDFs into interactive, persona-tailored research articles.';

export const PERSONA_LABELS: Record<string, string> = {
  expert: 'Domain Expert',
  student: 'Graduate Student',
  reviewer: 'Peer Reviewer',
  journalist: 'Science Journalist',
  general: 'General Reader',
};

export const ROUTES = {
  HOME: '/',
  RESEARCHER_HOME: '/researcher-home',
  PAPER_VIEW: '/paper/:paperId',
  REPLICATION: '/replication/:paperId',
  DIGITAL_LAB: '/digital-lab',
  PROFILE: '/profile/:userId',
} as const;

export type PaperStatus = 'parsing' | 'structuring' | 'chunking' | 'extracting_figures' | 'completed';

export const MODULE_ORDER_BY_PERSONA: Record<SubPersonaId, ModuleId[]> = {
  phd_postdoc: ['M1', 'M2', 'M3', 'M4', 'M5', 'M6'],
  pi_tenure: ['M2', 'M1', 'M3', 'M5', 'M4', 'M6'],
  think_tank: ['M1', 'M5', 'M2', 'M6', 'M3', 'M4'],
  gov_institution: ['M1', 'M5', 'M6', 'M2', 'M4', 'M3'],
  funder_governmental: ['M1', 'M2', 'M5', 'M3', 'M4', 'M6'],
  funder_private: ['M1', 'M5', 'M2', 'M3', 'M4', 'M6'],
  industry_rd: ['M2', 'M3', 'M1', 'M5', 'M4', 'M6'],
  ai_agent: ['M1', 'M2', 'M3', 'M4', 'M5', 'M6'],
};

export const PERSONA_CONTENT_MODALITIES: Record<string, string[]> = {
  Researcher: ['text_data', 'interactive_charts', 'protocols', 'code', 'comparison_tables', 'citation_snippets', 'videos'],
  'Policy Maker': ['executive_briefs', 'infographics', 'short_videos', 'decision_matrices', 'context_snapshots'],
  'Funding Agency': ['compliance_dashboards', 'impact_metrics', 'portfolio_views', 'automated_reporting'],
  'Industry R&D': ['tech_scouting', 'competitive_benchmarks', 'talent_profiles', 'feasibility_scores'],
};

export const PIPELINE_STEPS: { key: PaperStatus; label: string }[] = [
  { key: 'parsing', label: 'Parsing' },
  { key: 'structuring', label: 'Structuring' },
  { key: 'chunking', label: 'Embedding' },
  { key: 'extracting_figures', label: 'Figures' },
  { key: 'completed', label: 'Completed' },
];
