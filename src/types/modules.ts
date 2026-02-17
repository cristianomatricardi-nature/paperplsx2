export type ModuleId = 'M1' | 'M2' | 'M3' | 'M4' | 'M5' | 'M6';
export type ModuleTier = 'core' | 'satellite';

export interface ModuleDefinition {
  id: ModuleId;
  key: string;
  title: string;
  tier: ModuleTier;
  color: string;
  icon: string;
  focusSections: string[];
}

export const MODULE_REGISTRY: ModuleDefinition[] = [
  { id: 'M1', key: 'contribution_impact', title: 'Contribution & Impact Statement', tier: 'core', color: '#3B82F6', icon: '🎯', focusSections: ['abstract', 'discussion', 'conclusion', 'results'] },
  { id: 'M2', key: 'claim_evidence', title: 'Claim & Evidence Unit', tier: 'core', color: '#3B82F6', icon: '🔬', focusSections: ['results', 'discussion', 'abstract'] },
  { id: 'M3', key: 'method_protocol', title: 'Method & Protocol Card', tier: 'core', color: '#3B82F6', icon: '📋', focusSections: ['methods', 'materials', 'experimental'] },
  { id: 'M4', key: 'exploratory_negative', title: 'Exploratory & Negative Results Archive', tier: 'satellite', color: '#F59E0B', icon: '🔍', focusSections: ['results', 'discussion', 'limitations'] },
  { id: 'M5', key: 'call_to_action', title: 'Call-to-Actions', tier: 'satellite', color: '#F59E0B', icon: '📢', focusSections: ['conclusion', 'future_work', 'discussion'] },
  { id: 'M6', key: 'scicomm', title: 'SciComms', tier: 'satellite', color: '#F59E0B', icon: '🌍', focusSections: ['abstract', 'introduction', 'conclusion'] },
];

export type SubPersonaId =
  | 'phd_postdoc'
  | 'pi_tenure'
  | 'think_tank'
  | 'gov_institution'
  | 'funder_governmental'
  | 'funder_private'
  | 'industry_rd'
  | 'ai_agent';

export interface SubPersonaDefinition {
  id: SubPersonaId;
  parentPersona: string;
  label: string;
  shortLabel: string;
  painPoint: string;
  numberPolicy: string;
  statisticsDisplay: string;
  languageStyle: string;
  moduleOrder: ModuleId[];
}

export const SUB_PERSONA_REGISTRY: SubPersonaDefinition[] = [
  {
    id: 'phd_postdoc',
    parentPersona: 'Researcher',
    label: 'PhD Student / Post-doc',
    shortLabel: 'PhD/Post-doc',
    painPoint: 'I need to understand what has been done before and navigate publishing without feeling overwhelmed.',
    numberPolicy: 'explained_raw',
    statisticsDisplay: 'Key numbers with plain-language interpretations. Include effect sizes and p-values but explain what they mean.',
    languageStyle: 'Clear, educational, encouraging. Define technical terms on first use.',
    moduleOrder: ['M1', 'M2', 'M3', 'M4', 'M5', 'M6'],
  },
  {
    id: 'pi_tenure',
    parentPersona: 'Researcher',
    label: 'Tenure-Track Faculty / PI',
    shortLabel: 'PI',
    painPoint: 'I need to publish quickly and visibly, lead my team, and secure funding despite system friction.',
    numberPolicy: 'all_raw',
    statisticsDisplay: 'All statistics: exact p-values, confidence intervals, effect sizes, raw numbers, sample sizes.',
    languageStyle: 'Expert-level, concise, strategic. Assume full domain knowledge.',
    moduleOrder: ['M2', 'M1', 'M3', 'M5', 'M4', 'M6'],
  },
  {
    id: 'think_tank',
    parentPersona: 'Policy Maker',
    label: 'Think Tank Researcher/Analyst',
    shortLabel: 'Think Tank',
    painPoint: 'I need to synthesize vast research into credible policy recommendations faster than the evidence accumulates.',
    numberPolicy: 'inferred_only',
    statisticsDisplay: 'Population-level impact numbers, cost-benefit ratios, scale of effect. No raw p-values.',
    languageStyle: 'Analytical but accessible. Evidence-focused, policy-oriented framing.',
    moduleOrder: ['M1', 'M5', 'M2', 'M6', 'M3', 'M4'],
  },
  {
    id: 'gov_institution',
    parentPersona: 'Policy Maker',
    label: 'Governmental Institution Official',
    shortLabel: 'Government',
    painPoint: 'I need to make evidence-based decisions under time pressure, but papers are impenetrable.',
    numberPolicy: 'decision_ready',
    statisticsDisplay: 'Scale, population impact, cost-effectiveness. Decision-ready numbers only.',
    languageStyle: 'Jargon-free, executive-summary style. Short sentences, clear conclusions.',
    moduleOrder: ['M1', 'M5', 'M6', 'M2', 'M4', 'M3'],
  },
  {
    id: 'funder_governmental',
    parentPersona: 'Funding Agency',
    label: 'Governmental Funder (NSF/ERC/NIH)',
    shortLabel: 'Gov. Funder',
    painPoint: 'I need to demonstrate public ROI but lack tools to track outcomes across thousands of grants.',
    numberPolicy: 'decision_ready',
    statisticsDisplay: 'Impact metrics, benchmarks, portfolio-level comparisons. ROI-focused numbers.',
    languageStyle: 'Formal, accountability-oriented. Emphasis on measurable outcomes and compliance.',
    moduleOrder: ['M1', 'M2', 'M5', 'M3', 'M4', 'M6'],
  },
  {
    id: 'funder_private',
    parentPersona: 'Funding Agency',
    label: 'Private Funder (Gates/Wellcome)',
    shortLabel: 'Private Funder',
    painPoint: 'I need to allocate capital to highest-impact research but cannot compare heterogeneous projects.',
    numberPolicy: 'inferred_only',
    statisticsDisplay: 'Mission-alignment scores, scalability indicators, comparative benchmarks.',
    languageStyle: 'Strategic, mission-driven. Focus on potential and transferability.',
    moduleOrder: ['M1', 'M5', 'M2', 'M3', 'M4', 'M6'],
  },
  {
    id: 'industry_rd',
    parentPersona: 'Industry R&D',
    label: 'Industry R&D Professional',
    shortLabel: 'Industry',
    painPoint: 'I struggle to find talent and identify technologies to acquire from academia.',
    numberPolicy: 'all_raw',
    statisticsDisplay: 'Performance benchmarks, KPIs, competitive comparisons, TRL levels.',
    languageStyle: 'Business-oriented, ROI-focused. Emphasize commercial applicability and scalability.',
    moduleOrder: ['M2', 'M3', 'M1', 'M5', 'M4', 'M6'],
  },
  {
    id: 'ai_agent',
    parentPersona: 'AI Agent',
    label: 'AI Agent (Machine-Readable)',
    shortLabel: 'AI Agent',
    painPoint: 'I need structured, raw data without prose for downstream programmatic consumption.',
    numberPolicy: 'all_raw',
    statisticsDisplay: 'All raw numbers in structured JSON. No prose embellishments.',
    languageStyle: 'Terse, structured, machine-optimized. Pure data extraction.',
    moduleOrder: ['M1', 'M2', 'M3', 'M4', 'M5', 'M6'],
  },
];
