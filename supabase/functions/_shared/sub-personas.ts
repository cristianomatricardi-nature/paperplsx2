export interface SubPersona {
  id: string;
  parentPersona: string;
  label: string;
  painPoint: string;
  numberPolicy: "all_raw" | "explained_raw" | "narrative_only" | "inferred_only" | "decision_ready";
  statisticsDisplay: string;
  inferredDataPolicy: string;
  jargonLevel: "define_all" | "assume_domain" | "no_jargon" | "business_terms";
  languageStyle: string;
  contentGoal: string;
  depthPreference: "exhaustive" | "balanced" | "executive";
  comparativeFraming: string;
  educationalExtras: boolean;
  broaderImpactAssessment: boolean;
  disclaimers: string[];
  moduleInstructions: Record<string, string>;
}

export const SUB_PERSONA_REGISTRY: Record<string, SubPersona> = {
  phd_postdoc: {
    id: "phd_postdoc",
    parentPersona: "Researcher",
    label: "PhD Student / Post-doc",
    painPoint: "I need to understand what has been done before and navigate publishing without feeling overwhelmed.",
    numberPolicy: "explained_raw",
    statisticsDisplay: "Key numbers with plain-language interpretations. Include effect sizes and p-values but explain what they mean. Present detailed comparison tables where relevant.",
    inferredDataPolicy: "Never infer. Only report what the paper states.",
    jargonLevel: "define_all",
    languageStyle: "Clear, educational, encouraging. Define technical terms on first use.",
    contentGoal: "Understand the paper's contribution, evaluate whether to build on it, and identify learning resources.",
    depthPreference: "balanced",
    comparativeFraming: "Prior work in field — what existed before and how this advances it.",
    educationalExtras: true,
    broaderImpactAssessment: false,
    disclaimers: [],
    moduleInstructions: {
      M1: "You are writing for a PhD student or post-doctoral researcher who needs to quickly understand what this paper contributes to the field and whether it's relevant to their own research. Use clear, educational language. Define technical terms on first use. Include key numbers with plain-language interpretations. Frame the contribution in terms of: What gap does this fill? How does this help me position my own work? What should I cite from this paper?",
      M2: "You are writing for a PhD student or post-doc who needs to evaluate the claims in this paper to decide whether to build on them. Present each claim with its evidence clearly. Include effect sizes and p-values but explain what they mean in context. Highlight which claims are strong enough to build a thesis on vs. which need further validation. Use an encouraging, educational tone.",
      M3: "You are writing for a PhD student or post-doc who may need to replicate these methods in their own lab. Provide maximum detail on every step. Flag any steps that require specialized equipment or expertise. Include tips for common pitfalls. If any step is under-specified, note it explicitly. Think of this as a lab notebook entry that a newcomer could follow.",
      M4: "You are writing for a PhD student or post-doc who needs to know what NOT to try. Present negative results as valuable knowledge that saves time and resources. Frame each negative result as: 'This was tested, it didn't work, and here's why that's useful for your research.' Help them avoid dead ends in their own thesis work.",
      M5: "You are writing for a PhD student or post-doc looking for their next research direction. Present call-to-actions as potential thesis chapters, paper ideas, or collaboration opportunities. Prioritize actions that a junior researcher could realistically pursue. Flag which actions require significant resources vs. which could be done with limited funding.",
      M6: "You are writing science communication assets for a PhD student or post-doc who needs to explain their field to non-specialists (e.g., at a conference, in a grant application, or on social media). Provide analogies they can use, plain-language summaries they can adapt, and social media posts they can customize. Keep the tone accessible but scientifically accurate.",
    },
  },

  pi_tenure: {
    id: "pi_tenure",
    parentPersona: "Researcher",
    label: "Tenure-Track Faculty / PI",
    painPoint: "I need to publish quickly and visibly, lead my team, and secure funding despite system friction.",
    numberPolicy: "all_raw",
    statisticsDisplay: "All statistics: exact p-values, confidence intervals, effect sizes, raw numbers, sample sizes.",
    inferredDataPolicy: "Never infer. Only report what the paper states.",
    jargonLevel: "assume_domain",
    languageStyle: "Expert-level, concise, strategic. Assume full domain knowledge.",
    contentGoal: "Assess strategic significance for research program, identify competitive landscape, and inform grant writing.",
    depthPreference: "exhaustive",
    comparativeFraming: "Competitive landscape — how does this position against my lab's work.",
    educationalExtras: false,
    broaderImpactAssessment: false,
    disclaimers: [],
    moduleInstructions: {
      M1: "You are writing for a Principal Investigator or tenure-track faculty member who needs to quickly assess this paper's significance for their research program. Be concise and strategic. Assume full domain knowledge — no need to define terms. Focus on: How does this position against my lab's work? Is this a competitor, collaborator, or irrelevant? What's the citation potential? Include all quantitative metrics.",
      M2: "You are writing for a PI who needs to evaluate evidence quality at expert level. Present all statistics: exact p-values, confidence intervals, effect sizes, sample sizes. Flag any methodological concerns. Assess whether the evidence is strong enough to inform grant applications or redirect research priorities. Be direct and critical.",
      M3: "You are writing for a PI who needs to evaluate whether these methods are worth adopting in their lab. Focus on efficiency, cost, scalability, and novelty compared to standard approaches. Include all technical specifications. Flag any methods that require significant investment to implement. Assess the reproducibility quality.",
      M4: "You are writing for a PI who needs to know the boundaries of this work for strategic planning. Present negative results in terms of: What hypotheses were eliminated? What does this mean for the field's direction? How does this affect funding priorities? Be concise and strategic.",
      M5: "You are writing for a PI who is looking for strategic opportunities. Present call-to-actions in terms of: grant opportunities, collaboration potential, competitive positioning, and lab direction. Prioritize high-impact actions. Flag time-sensitive opportunities.",
      M6: "You are writing science communication assets for a PI who needs to communicate their field to funders, media, and institutional leadership. Provide polished, quotable statements. Include talking points for presentations and media interviews. Focus on impact and significance rather than technical details.",
    },
  },

  think_tank: {
    id: "think_tank",
    parentPersona: "Policy Maker",
    label: "Think Tank Researcher/Analyst",
    painPoint: "I need to synthesize vast research into credible policy recommendations faster than the evidence accumulates.",
    numberPolicy: "inferred_only",
    statisticsDisplay: "Population-level impact numbers, cost-benefit ratios, scale of effect. No raw p-values — translate to practical significance.",
    inferredDataPolicy: "Infer population-level impact and cost-benefit ratios where reasonable. ALWAYS add disclaimer: 'AI-inferred estimate — not stated in paper. Verify independently.' If no policy angle exists, state so clearly.",
    jargonLevel: "no_jargon",
    languageStyle: "Analytical but accessible. Evidence-focused, policy-oriented framing.",
    contentGoal: "Synthesize research into citable, verifiable policy insights with evidence quality assessment.",
    depthPreference: "balanced",
    comparativeFraming: "Existing policy baselines and evidence base.",
    educationalExtras: false,
    broaderImpactAssessment: true,
    disclaimers: ["AI-inferred statistics are estimates derived from paper data — not stated by the authors. Verify independently before citing in policy documents."],
    moduleInstructions: {
      M1: "You are writing for a think tank researcher/analyst who needs to synthesize this paper into policy-relevant insights. Use analytical but accessible language. Frame the contribution in terms of: What policy question does this address? What's the evidence quality? How does this compare to the existing evidence base? Include population-level impact numbers and cost-benefit indicators where available. No raw p-values — translate to practical significance.",
      M2: "You are writing for a think tank analyst who needs citable, verifiable facts for policy recommendations. Present each claim with its practical significance, not statistical significance. Frame evidence in terms of: Is this strong enough to base a policy recommendation on? What are the caveats? Include confidence levels in plain language (e.g., 'high confidence' rather than 'p < 0.001').",
      M3: "You are writing for a think tank analyst who needs to assess the transparency and rigor of the methods, not replicate them. Provide a brief, non-technical summary of the methodology. Focus on: Was the approach appropriate? Are there methodological limitations that affect policy relevance? Is the sample representative? Could the results generalize to policy-relevant populations?",
      M4: "You are writing for a think tank analyst who needs to identify gaps in the evidence base. Present negative results as: What questions remain unanswered? Where is the evidence insufficient for policy? What additional research is needed before policy action? This helps combat publication bias in evidence synthesis.",
      M5: "You are writing for a think tank analyst who needs to translate research into actionable policy recommendations. Present call-to-actions specifically framed for policy: What should policymakers do with this evidence? What regulations or programs could be informed by this? What stakeholders need to be engaged? Include urgency levels.",
      M6: "You are writing science communication assets for a think tank that needs to communicate research findings to policymakers and the public. Provide policy briefs, infographic outlines, and key messages. Use language that resonates with government officials. Include a 'policy implications' summary that could be inserted directly into a policy document.",
    },
  },

  gov_institution: {
    id: "gov_institution",
    parentPersona: "Policy Maker",
    label: "Governmental Institution Official",
    painPoint: "I need to make evidence-based decisions under time pressure, but papers are impenetrable.",
    numberPolicy: "decision_ready",
    statisticsDisplay: "Scale, population impact, cost-effectiveness. Decision-ready numbers only.",
    inferredDataPolicy: "Infer broader impact where reasonable. ALWAYS disclaim as AI-estimated. If this research has no direct policy or societal impact at the regional or national level, state that explicitly rather than fabricating relevance.",
    jargonLevel: "no_jargon",
    languageStyle: "Jargon-free, executive-summary style. Short sentences, clear conclusions.",
    contentGoal: "Get the bottom line for decision-making: Is action needed? What's the scale? What's the cost?",
    depthPreference: "executive",
    comparativeFraming: "Impact on constituents and existing government programs.",
    educationalExtras: false,
    broaderImpactAssessment: true,
    disclaimers: ["AI-inferred impact estimates are not stated in the paper. Verify with domain experts before policy action."],
    moduleInstructions: {
      M1: "You are writing for a government official who has limited time and needs the bottom line. Use executive-summary style: short sentences, clear conclusions, no jargon. Frame the contribution as: What does this mean for our constituents? What's the scale of impact? Is immediate action needed? Include only decision-ready numbers. If this research has no direct policy or societal impact at the regional or national level, state that explicitly.",
      M2: "You are writing for a government official who needs to know: Can I trust this evidence enough to act on it? Present claims as decision-ready statements. Use confidence language (high/medium/low confidence). Include the scale of effect in terms a non-scientist would understand (e.g., 'affects 1 in 5 people' rather than 'OR = 1.2').",
      M3: "You are writing for a government official who needs a 2-sentence summary of the methodology and whether it's credible. Do not include technical details. Focus on: Was this a large, well-designed study? Are there obvious limitations? Would an independent expert consider this reliable?",
      M4: "You are writing for a government official who needs to know what this research does NOT tell us. Present gaps and limitations as: What questions remain before we can act? What additional evidence would we need? Frame this as risk assessment for policy decisions.",
      M5: "You are writing for a government official who needs concrete, implementable recommendations. Present call-to-actions as: What specific policy action is recommended? What's the timeline? What's the cost? Who needs to be involved? Use bureaucratic-friendly language and structure.",
      M6: "You are writing communication assets for a government press office. Provide: a 3-sentence press release summary, key talking points for officials, and a public-facing FAQ. Use language appropriate for government communications — formal but accessible.",
    },
  },

  funder_governmental: {
    id: "funder_governmental",
    parentPersona: "Funding Agency",
    label: "Governmental Funder (NSF/ERC/NIH)",
    painPoint: "I need to demonstrate public ROI but lack tools to track outcomes across thousands of grants.",
    numberPolicy: "decision_ready",
    statisticsDisplay: "Impact metrics, benchmarks, portfolio-level comparisons. ROI-focused numbers.",
    inferredDataPolicy: "Infer ROI and benchmarks where reasonable. ALWAYS disclaim as AI-estimated.",
    jargonLevel: "no_jargon",
    languageStyle: "Formal, accountability-oriented. Emphasis on measurable outcomes and compliance.",
    contentGoal: "Evaluate whether funded research produced commensurate results and identify follow-up priorities.",
    depthPreference: "balanced",
    comparativeFraming: "Portfolio-level comparisons — how does this compare to other funded projects in the same program.",
    educationalExtras: false,
    broaderImpactAssessment: true,
    disclaimers: ["AI-inferred ROI and impact metrics are estimates — not stated by the authors. Verify against program records."],
    moduleInstructions: {
      M1: "You are writing for a program officer at a governmental funding agency (NSF, ERC, NIH) who needs to evaluate this paper's contribution against their portfolio. Frame the contribution in terms of: Does this advance the field as expected? Is this a breakthrough or incremental? How does this compare to other funded projects in the same program? Include impact metrics and benchmarks.",
      M2: "You are writing for a program officer who needs to verify that funded research produced credible results. Present claims with an accountability lens: Were the stated objectives met? Is the evidence quality commensurate with the funding level? Are there any concerns about reproducibility? Include all quantitative metrics.",
      M3: "You are writing for a program officer who needs to assess whether the methods represent good use of public funds. Focus on: Were the methods efficient? Could the same results have been achieved with less expensive approaches? Are the methods reusable by other funded projects? Assess methodological innovation.",
      M4: "You are writing for a program officer who needs to know about negative results to avoid funding the same dead ends. Present negative results as: What approaches should future applicants avoid? What does this tell us about the viability of this research direction? How should this inform future funding calls?",
      M5: "You are writing for a program officer who needs to identify follow-up funding priorities. Present call-to-actions as: What should the next funding call prioritize? What infrastructure investments are needed? What interdisciplinary collaborations should be encouraged? Frame in terms of portfolio strategy.",
      M6: "You are writing communication assets for a funding agency's public outreach. Provide: a taxpayer-friendly summary of what this research achieved, key impact numbers for annual reports, and a success story narrative. Emphasize public value and return on investment.",
    },
  },

  funder_private: {
    id: "funder_private",
    parentPersona: "Funding Agency",
    label: "Private Funder (Gates/Wellcome)",
    painPoint: "I need to allocate capital to highest-impact research but cannot compare heterogeneous projects.",
    numberPolicy: "inferred_only",
    statisticsDisplay: "Mission-alignment scores, scalability indicators, comparative benchmarks.",
    inferredDataPolicy: "Infer scalability and mission-alignment where reasonable. ALWAYS disclaim as AI-estimated.",
    jargonLevel: "no_jargon",
    languageStyle: "Strategic, mission-driven. Focus on potential and transferability.",
    contentGoal: "Assess mission alignment, scalability potential, and whether to continue or pivot investment.",
    depthPreference: "balanced",
    comparativeFraming: "Mission-alignment and impact-per-dollar compared to alternative approaches.",
    educationalExtras: false,
    broaderImpactAssessment: true,
    disclaimers: ["AI-inferred scalability and alignment scores are estimates — not stated by the authors. Verify with program team."],
    moduleInstructions: {
      M1: "You are writing for a program officer at a private foundation (Gates, Wellcome) who needs to assess mission alignment. Frame the contribution in terms of: Does this advance our mission? What's the scalability potential? How does this compare to other approaches we've funded? Include mission-alignment indicators and transferability scores.",
      M2: "You are writing for a private funder who needs to assess whether this research justifies continued investment. Present claims with a strategic lens: Are the findings actionable? Do they open new avenues for the foundation's mission? What's the potential for scaling the findings? Include comparative benchmarks.",
      M3: "You are writing for a private funder who needs to assess scalability and transferability of methods. Focus on: Can these methods be deployed in resource-limited settings? What's the cost per unit of impact? Are there simpler alternatives? Assess the potential for technology transfer.",
      M4: "You are writing for a private funder who needs honest assessment of what didn't work. Present negative results as learning opportunities: What does this tell us about our theory of change? Should we pivot our funding strategy? What assumptions were invalidated?",
      M5: "You are writing for a private funder looking for the highest-impact next investment. Present call-to-actions ranked by potential impact and feasibility. Include estimated resource requirements. Frame in terms of: What would maximize our mission impact per dollar invested?",
      M6: "You are writing communication assets for a foundation's donor relations and annual report. Provide: a compelling narrative of the research's impact, key numbers for impact reports, and a story that connects the research to real-world beneficiaries. Emphasize human impact and mission progress.",
    },
  },

  industry_rd: {
    id: "industry_rd",
    parentPersona: "Industry R&D",
    label: "Industry R&D Professional",
    painPoint: "I struggle to find talent and identify technologies to acquire from academia.",
    numberPolicy: "all_raw",
    statisticsDisplay: "Performance benchmarks, KPIs, competitive comparisons, TRL levels.",
    inferredDataPolicy: "Infer TRL and commercial metrics where reasonable. ALWAYS disclaim as AI-estimated.",
    jargonLevel: "business_terms",
    languageStyle: "Business-oriented, ROI-focused. Emphasize commercial applicability and scalability.",
    contentGoal: "Evaluate commercial potential, licensing opportunities, and talent acquisition targets.",
    depthPreference: "balanced",
    comparativeFraming: "Commercial alternatives and existing industry solutions.",
    educationalExtras: false,
    broaderImpactAssessment: false,
    disclaimers: ["AI-inferred TRL and commercial metrics are estimates — not stated by the authors. Conduct independent due diligence."],
    moduleInstructions: {
      M1: "You are writing for an R&D professional in industry who is scouting academic research for commercial potential. Frame the contribution in terms of: What's the technology readiness level (TRL)? What's the competitive landscape? Is this patentable or licensable? What's the time-to-market estimate? Include performance benchmarks and KPIs.",
      M2: "You are writing for an industry R&D professional who needs to assess whether these findings are commercially viable. Present claims with a business lens: Are the results reproducible at scale? What's the performance compared to existing commercial solutions? Include quantitative benchmarks, KPIs, and competitive comparisons.",
      M3: "You are writing for an industry R&D professional evaluating whether to adopt or license these methods. Focus on: What's the cost of implementation? What specialized equipment is needed? Can this be automated? What's the throughput? How does this compare to our current process? Include a feasibility assessment.",
      M4: "You are writing for an industry R&D professional who needs to know the limitations before investing. Present negative results as: What are the technical barriers to commercialization? What failure modes were identified? What conditions cause the approach to fail? Frame as risk assessment for R&D investment.",
      M5: "You are writing for an industry R&D professional looking for opportunities. Present call-to-actions as: What licensing opportunities exist? What talent could we recruit? What partnerships could accelerate commercialization? What IP considerations should we be aware of? Include urgency indicators.",
      M6: "You are writing communication assets for an industry R&D team that needs to present academic findings to business leadership. Provide: a business case summary, ROI projections (if inferable), competitive advantage analysis, and a slide-ready executive summary. Use business language, not academic language.",
    },
  },
};
