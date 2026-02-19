/**
 * Parent Persona Registry
 * 
 * Defines visualization paradigm and liquefaction config per parent persona.
 * Mirrors how sub-personas.ts drives sub-persona AI content, but at the parent level.
 * 
 * To add a new parent persona visualization:
 * 1. Add entry to PARENT_PERSONA_REGISTRY with its liquefactionPrompt
 * 2. Create a new view component in src/components/paper-view/views/
 * 3. Add case to the switch in PaperViewPage.tsx
 */

export type VisualizationType =
  | 'researcher_modules'
  | 'policy_dashboard'
  | 'roi_dashboard'
  | 'tech_scouting'
  | 'api_console';

export interface ParentPersonaConfig {
  id: string;
  visualizationType: VisualizationType;
  /** Modules to fetch and display prominently */
  primaryModules: string[];
  /** Modules to fetch and display in supporting sections */
  secondaryModules: string[];
  /** Which cached module outputs feed the liquefaction prompt */
  liquefactionInputModules: string[];
  /**
   * Returns a fully composed prompt for the liquefaction edge function.
   * Receives paper metadata and already-cached module JSON objects.
   * Returns empty string for personas that don't need liquefaction (Researcher, AI Agent).
   */
  liquefactionPrompt: (
    paper: { title: string; abstract: string | null },
    modulesContent: Record<string, unknown>
  ) => string;
}

export const PARENT_PERSONA_REGISTRY: Record<string, ParentPersonaConfig> = {
  Researcher: {
    id: 'Researcher',
    visualizationType: 'researcher_modules',
    primaryModules: ['M1', 'M2', 'M3'],
    secondaryModules: ['M4', 'M5', 'M6'],
    liquefactionInputModules: [],
    liquefactionPrompt: () => '',
  },

  'Policy Maker': {
    id: 'Policy Maker',
    visualizationType: 'policy_dashboard',
    primaryModules: ['M1', 'M5'],
    secondaryModules: ['M2', 'M6'],
    liquefactionInputModules: ['M1', 'M2', 'M5'],
    liquefactionPrompt: (paper, modulesContent) => {
      const m1 = modulesContent['M1'] as any;
      const m2 = modulesContent['M2'] as any;
      const m5 = modulesContent['M5'] as any;

      const coreContribution = m1?.tabs?.overview?.core_contribution ?? 'Not available';
      const fieldImpact = m1?.tabs?.impact_analysis?.field_impact ?? '';
      const metrics = m1?.tabs?.impact_analysis?.metrics ?? [];
      const claims = m2?.tabs?.claims ?? [];
      const claimsText = claims
        .slice(0, 6)
        .map((c: any) => `- ${c.statement} [${c.strength}]`)
        .join('\n');
      const policyActions = m5?.tabs?.policy_actions ?? [];
      const researchActions = m5?.tabs?.research_actions ?? [];
      const allActions = [...policyActions, ...researchActions];
      const actionsText = allActions
        .slice(0, 6)
        .map((a: any) => `- ${a.action}`)
        .join('\n');

      return `You are a policy intelligence analyst. Analyze this scientific paper and produce a structured policy intelligence brief for senior policymakers and think tank analysts.

PAPER TITLE: ${paper.title}
ABSTRACT: ${paper.abstract ?? 'Not available'}
CORE FINDING: ${coreContribution}
FIELD IMPACT: ${fieldImpact}
KEY METRICS: ${JSON.stringify(metrics.slice(0, 5))}
KEY CLAIMS:
${claimsText || 'No claims extracted yet.'}
RESEARCH ACTIONS / POLICY RECOMMENDATIONS:
${actionsText || 'No actions extracted yet.'}

Your task: Produce a JSON policy intelligence brief. Be precise and evidence-based. Translate scientific findings into policy-relevant language.

Return ONLY valid JSON with this exact structure:
{
  "executive_strip": {
    "relevance_score": <integer 1-10>,
    "relevance_reasoning": "<2-3 sentences explaining why this score — be specific about policy relevance>",
    "confidence_level": "<'high' | 'medium' | 'low' — based on evidence quality>",
    "top_finding": "<One precise sentence: the single most important finding for a policymaker>"
  },
  "policy_tags": {
    "policy_areas": ["<area1>", "<area2>", "<area3>"],
    "policy_relevance_score": <integer 1-10>,
    "policy_relevance_reasoning": "<Specific explanation of policy relevance>",
    "suggested_policy_contexts": [
      { "context": "<specific policy framework, e.g. 'EU Green Deal' or 'WHO Framework Convention'>", "relevance": "<1-2 sentences: how this paper directly supports or challenges this policy>" },
      { "context": "<another specific policy>", "relevance": "<explanation>" },
      { "context": "<another specific policy>", "relevance": "<explanation>" }
    ]
  },
  "policy_brief": {
    "evidence_quality": "<'Strong' | 'Moderate' | 'Preliminary'>",
    "key_claims_summary": [
      "<Claim 1 in plain policy language — no jargon>",
      "<Claim 2 in plain policy language>",
      "<Claim 3 in plain policy language>"
    ],
    "recommended_actions": [
      "<Concrete action 1 for policymakers>",
      "<Concrete action 2 for policymakers>",
      "<Concrete action 3 for policymakers>"
    ],
    "full_brief_text": "<3-4 paragraph executive policy brief. Para 1: context and finding. Para 2: evidence quality and key claims. Para 3: policy implications and recommended actions. Para 4: caveats and limitations. Write for a non-scientist senior official.>"
  },
  "infographic_spec": {
    "title": "<Concise infographic title>",
    "sections": ["<Key point 1>", "<Key point 2>", "<Key point 3>", "<Key point 4>"],
    "key_visual_description": "<Description for an infographic designer: what the main visual should show, e.g. 'Bar chart comparing X across Y countries with Z highlighted'>"
  }
}`;
    },
  },

  // Stubs for future phases — liquefactionPrompt will be implemented when views are built
  'Funding Agency': {
    id: 'Funding Agency',
    visualizationType: 'roi_dashboard',
    primaryModules: ['M1', 'M2'],
    secondaryModules: ['M5', 'M3'],
    liquefactionInputModules: ['M1', 'M2', 'M5'],
    liquefactionPrompt: (_paper, _content) => '', // TODO: implement in Funding Agency phase
  },

  'Industry R&D': {
    id: 'Industry R&D',
    visualizationType: 'tech_scouting',
    primaryModules: ['M2', 'M3'],
    secondaryModules: ['M1', 'M5'],
    liquefactionInputModules: ['M1', 'M2', 'M3'],
    liquefactionPrompt: (_paper, _content) => '', // TODO: implement in Industry phase
  },

  'AI Agent': {
    id: 'AI Agent',
    visualizationType: 'api_console',
    primaryModules: [],
    secondaryModules: [],
    liquefactionInputModules: [],
    liquefactionPrompt: () => '',
  },
};
