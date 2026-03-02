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
  | 'api_console'
  | 'lesson_plan';

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

  'Funding Agency': {
    id: 'Funding Agency',
    visualizationType: 'roi_dashboard',
    primaryModules: ['M1', 'M2'],
    secondaryModules: ['M5', 'M3'],
    liquefactionInputModules: ['M1', 'M2', 'M5'],
    liquefactionPrompt: (paper, modulesContent) => {
      const m1 = modulesContent['M1'] as any;
      const m2 = modulesContent['M2'] as any;
      const m5 = modulesContent['M5'] as any;

      const coreContribution = m1?.tabs?.overview?.core_contribution ?? 'Not available';
      const metrics = m1?.tabs?.impact_analysis?.metrics ?? [];
      const claims = m2?.tabs?.claims ?? [];
      const claimsText = claims
        .slice(0, 8)
        .map((c: any) => `- ${c.statement} [${c.strength}]`)
        .join('\n');
      const researchActions = m5?.tabs?.research_actions ?? [];
      const actionsText = researchActions
        .slice(0, 6)
        .map((a: any) => `- ${a.action}`)
        .join('\n');

      return `You are a grant accountability analyst reviewing a single funded research paper. Your job is to assess whether the research met its stated aims, evaluate evidence quality, and catalog reusable outputs.

PAPER TITLE: ${paper.title}
ABSTRACT: ${paper.abstract ?? 'Not available'}
CORE FINDING: ${coreContribution}
KEY METRICS: ${JSON.stringify(metrics.slice(0, 8))}
KEY CLAIMS:
${claimsText || 'No claims extracted yet.'}
RESEARCH NEXT STEPS:
${actionsText || 'No actions extracted yet.'}

RULES:
- No cross-paper metrics, no citation counts, no journal impact factor.
- Avoid hype language; keep copy factual.
- Every aim/claim MUST have evidence_refs linking to figures, tables, or text snippets. If evidence is missing, set evidence_refs to an empty array.
- Add disclaimer field: "This summary reflects one paper and does not measure real-world impact."

Return ONLY valid JSON with this exact structure:
{
  "metadata": {
    "title": "<paper title>",
    "authors": ["<author1>", "<author2>"],
    "journal": "<journal name or null>",
    "year": "<publication year or null>",
    "doi": "<DOI or null>",
    "funders": ["<funder name if mentioned>"],
    "grant_ids": ["<grant ID if mentioned>"]
  },
  "aims": [
    {
      "id": "aim_1",
      "statement": "<the stated research aim>",
      "planned_endpoint": "<what they planned to measure/achieve>",
      "status": "<met|partial|not_met|inconclusive|not_addressed>",
      "outcome_summary": "<1-2 sentences on what actually happened>",
      "effect_size_text": "<effect size in plain language, or null>",
      "uncertainty_text": "<confidence intervals or uncertainty, or null>",
      "confidence": "<high|medium|low>",
      "confidence_rationale": ["<reason 1 for this confidence level>", "<reason 2>"],
      "evidence_refs": ["ref_1", "ref_2"]
    }
  ],
  "key_findings": [
    {
      "id": "finding_1",
      "finding": "<concise statement of finding>",
      "effect_size_text": "<effect size in plain language, or null>",
      "uncertainty_text": "<uncertainty/CI, or null>",
      "population_or_model": "<study population or model system>",
      "conditions": "<experimental conditions>",
      "confidence": "<high|medium|low>",
      "evidence_refs": ["ref_1"]
    }
  ],
  "evidence_refs": [
    {
      "id": "ref_1",
      "type": "<figure|table|text>",
      "label": "<Figure 1 / Table 2 / Section 3.1>",
      "caption_or_excerpt": "<brief caption or text excerpt>",
      "section": "<which paper section>",
      "url_or_anchor": "<anchor or null>"
    }
  ],
  "outputs": {
    "data": [{"name": "<dataset name>", "link": "<URL or null>", "license": "<license or unknown>", "access": "<open|restricted|unavailable>"}],
    "code": [{"name": "<repo name>", "link": "<URL or null>", "license": "<license or unknown>", "access": "<open|restricted|unavailable>"}],
    "protocols": [{"name": "<protocol name>", "link": "<URL or null>", "license": "<license or unknown>", "access": "<open|restricted|unavailable>"}],
    "materials": [{"name": "<material name>", "link": "<URL or null>", "license": "<license or unknown>", "access": "<open|restricted|unavailable>"}]
  },
  "limitations": ["<limitation 1>", "<limitation 2>"],
  "next_steps": [
    {
      "step": "<what should happen next>",
      "gating_evidence": "<what evidence is needed first>",
      "dependency": "<what this depends on>",
      "scale_hint": "<pilot|lab|field|population>"
    }
  ],
  "compliance": {
    "oa_status": "<gold|green|hybrid|closed|unknown>",
    "data_availability": "<open|restricted|unavailable|not_stated>",
    "code_availability": "<open|restricted|unavailable|not_stated>",
    "ethics": "<approved|exempt|not_stated>",
    "coi": "<none_declared|declared|not_stated>"
  },
  "disclaimer": "This summary reflects one paper and does not measure real-world impact."
}`;
    },
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

  Educator: {
    id: 'Educator',
    visualizationType: 'lesson_plan' as VisualizationType,
    primaryModules: ['M6', 'M1', 'M2'],
    secondaryModules: ['M3', 'M5', 'M4'],
    liquefactionInputModules: ['M1', 'M2', 'M6'],
    liquefactionPrompt: (paper, modulesContent) => {
      const m1 = modulesContent['M1'] as any;
      const m2 = modulesContent['M2'] as any;
      const m6 = modulesContent['M6'] as any;

      const coreContribution = m1?.tabs?.overview?.core_contribution ?? 'Not available';
      const claims = m2?.tabs?.claims ?? [];
      const claimsText = claims
        .slice(0, 5)
        .map((c: any) => `- ${c.statement}`)
        .join('\n');
      const scicommHooks = m6?.tabs?.hooks ?? [];
      const hooksText = scicommHooks
        .slice(0, 4)
        .map((h: any) => `- ${h.hook ?? h.text ?? JSON.stringify(h)}`)
        .join('\n');

      return `You are an educational content designer transforming a scientific paper into classroom-ready teaching materials. Create engaging, pedagogically sound content suitable for high school through university level.

PAPER TITLE: ${paper.title}
ABSTRACT: ${paper.abstract ?? 'Not available'}
CORE FINDING: ${coreContribution}
KEY CLAIMS:
${claimsText || 'No claims extracted yet.'}
SCICOMM HOOKS:
${hooksText || 'No hooks extracted yet.'}

Return ONLY valid JSON with this exact structure:
{
  "learning_objectives": [
    {
      "objective": "<specific, measurable learning objective>",
      "bloom_level": "<remember|understand|apply|analyze|evaluate|create>",
      "source_module": "<M1|M2|M3|M4|M5|M6>"
    }
  ],
  "simplified_explanation": {
    "summary": "<3-4 paragraph explanation of the paper suitable for a general science class>",
    "key_concepts": [
      {"term": "<scientific concept>", "definition": "<student-friendly definition>", "analogy": "<everyday analogy>"}
    ],
    "prerequisite_knowledge": ["<what students should already know>"]
  },
  "discussion_questions": [
    {
      "question": "<thought-provoking question for class discussion>",
      "suggested_answer_points": ["<key point 1>", "<key point 2>"],
      "difficulty": "<introductory|intermediate|advanced>"
    }
  ],
  "classroom_activities": [
    {
      "title": "<activity name>",
      "description": "<what students do, step by step>",
      "duration": "<estimated time, e.g. '30 minutes'>",
      "materials": ["<material 1>", "<material 2>"],
      "learning_outcome": "<what students will learn/demonstrate>"
    }
  ],
  "misconceptions": [
    {
      "misconception": "<common wrong assumption students might have>",
      "correction": "<the accurate understanding>",
      "evidence_ref": "<brief reference to paper evidence>"
    }
  ],
  "assessment": {
    "quiz_questions": [
      {
        "question": "<quiz question>",
        "options": ["<A>", "<B>", "<C>", "<D>"],
        "correct": 0,
        "explanation": "<why this answer is correct>"
      }
    ]
  },
  "further_reading": [
    {
      "title": "<resource title>",
      "type": "<article|video|simulation|textbook|website>",
      "url_or_description": "<URL or description of where to find it>",
      "level": "<beginner|intermediate|advanced>"
    }
  ]
}`;
    },
  },
};
