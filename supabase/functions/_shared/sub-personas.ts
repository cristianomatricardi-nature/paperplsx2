export interface SubPersona {
  id: string;
  parentPersona: string;
  label: string;
  painPoint: string;
  quantitativeDepth: string;
  languageStyle: string;
}

export const SUB_PERSONA_REGISTRY: Record<string, SubPersona> = {
  phd_postdoc: {
    id: "phd_postdoc",
    parentPersona: "Researcher",
    label: "PhD Student / Post-doc",
    painPoint: "I need to understand what has been done before and navigate publishing without feeling overwhelmed.",
    quantitativeDepth: "Key numbers with plain-language interpretations. Include effect sizes and p-values but explain what they mean.",
    languageStyle: "Clear, educational, encouraging. Define technical terms on first use.",
  },
  pi_tenure: {
    id: "pi_tenure",
    parentPersona: "Researcher",
    label: "Tenure-Track Faculty / PI",
    painPoint: "I need to publish quickly and visibly, lead my team, and secure funding despite system friction.",
    quantitativeDepth: "All statistics: exact p-values, confidence intervals, effect sizes, raw numbers, sample sizes.",
    languageStyle: "Expert-level, concise, strategic. Assume full domain knowledge.",
  },
  think_tank: {
    id: "think_tank",
    parentPersona: "Policy Maker",
    label: "Think Tank Researcher/Analyst",
    painPoint: "I need to synthesize vast research into credible policy recommendations faster than the evidence accumulates.",
    quantitativeDepth: "Population-level impact numbers, cost-benefit ratios, scale of effect. No raw p-values.",
    languageStyle: "Analytical but accessible. Evidence-focused, policy-oriented framing.",
  },
  gov_institution: {
    id: "gov_institution",
    parentPersona: "Policy Maker",
    label: "Governmental Institution Official",
    painPoint: "I need to make evidence-based decisions under time pressure, but papers are impenetrable.",
    quantitativeDepth: "Scale, population impact, cost-effectiveness. Decision-ready numbers only.",
    languageStyle: "Jargon-free, executive-summary style. Short sentences, clear conclusions.",
  },
  funder_governmental: {
    id: "funder_governmental",
    parentPersona: "Funding Agency",
    label: "Governmental Funder (NSF/ERC/NIH)",
    painPoint: "I need to demonstrate public ROI but lack tools to track outcomes across thousands of grants.",
    quantitativeDepth: "Impact metrics, benchmarks, portfolio-level comparisons. ROI-focused numbers.",
    languageStyle: "Formal, accountability-oriented. Emphasis on measurable outcomes and compliance.",
  },
  funder_private: {
    id: "funder_private",
    parentPersona: "Funding Agency",
    label: "Private Funder (Gates/Wellcome)",
    painPoint: "I need to allocate capital to highest-impact research but cannot compare heterogeneous projects.",
    quantitativeDepth: "Mission-alignment scores, scalability indicators, comparative benchmarks.",
    languageStyle: "Strategic, mission-driven. Focus on potential and transferability.",
  },
  industry_rd: {
    id: "industry_rd",
    parentPersona: "Industry R&D",
    label: "Industry R&D Professional",
    painPoint: "I struggle to find talent and identify technologies to acquire from academia.",
    quantitativeDepth: "Performance benchmarks, KPIs, competitive comparisons, TRL levels.",
    languageStyle: "Business-oriented, ROI-focused. Emphasize commercial applicability and scalability.",
  },
};
