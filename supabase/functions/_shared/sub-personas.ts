/**
 * SUB_PERSONA_REGISTRY
 *
 * Each top-level persona (expert, student, reviewer, journalist, general)
 * has sub-personas that further specify reader intent and language style.
 * Edge functions import this registry to build persona-tailored prompts.
 */

export interface SubPersona {
  id: string;
  parentPersona: string;
  label: string;
  painPoint: string;
  quantitativeDepth: string;
  languageStyle: string;
}

export const SUB_PERSONA_REGISTRY: Record<string, SubPersona> = {
  // ── Expert ──
  expert_researcher: {
    id: "expert_researcher",
    parentPersona: "expert",
    label: "Domain Researcher",
    painPoint: "Needs to quickly assess novelty and methodological rigor to decide whether to cite or build upon this work.",
    quantitativeDepth: "high",
    languageStyle: "Technical and precise, using domain-specific terminology.",
  },
  expert_clinician: {
    id: "expert_clinician",
    parentPersona: "expert",
    label: "Clinical Practitioner",
    painPoint: "Wants to know if the findings are clinically actionable and how they compare to current practice guidelines.",
    quantitativeDepth: "medium-high",
    languageStyle: "Evidence-based clinical language with practical implications.",
  },

  // ── Student ──
  student_phd: {
    id: "student_phd",
    parentPersona: "student",
    label: "PhD Student",
    painPoint: "Needs to understand the paper's contribution to the field and how it relates to their own research.",
    quantitativeDepth: "medium-high",
    languageStyle: "Academic but accessible, with clear explanations of complex concepts.",
  },
  student_undergrad: {
    id: "student_undergrad",
    parentPersona: "student",
    label: "Undergraduate Student",
    painPoint: "Struggling to parse dense academic writing; needs the core ideas in plain language.",
    quantitativeDepth: "low-medium",
    languageStyle: "Simple, clear language with analogies and definitions for jargon.",
  },

  // ── Reviewer ──
  reviewer_peer: {
    id: "reviewer_peer",
    parentPersona: "reviewer",
    label: "Peer Reviewer",
    painPoint: "Needs to evaluate the paper's claims, methods, and reproducibility quickly and systematically.",
    quantitativeDepth: "high",
    languageStyle: "Critical and evaluative, highlighting strengths and weaknesses.",
  },
  reviewer_editor: {
    id: "reviewer_editor",
    parentPersona: "reviewer",
    label: "Journal Editor",
    painPoint: "Needs a rapid assessment of scope fit, novelty, and potential impact for editorial decisions.",
    quantitativeDepth: "medium",
    languageStyle: "Concise and balanced, focusing on significance and fit.",
  },

  // ── Journalist ──
  journalist_science: {
    id: "journalist_science",
    parentPersona: "journalist",
    label: "Science Journalist",
    painPoint: "Needs to extract a compelling narrative and newsworthy angle without misrepresenting the science.",
    quantitativeDepth: "low",
    languageStyle: "Engaging, narrative-driven, avoids jargon, uses vivid comparisons.",
  },
  journalist_policy: {
    id: "journalist_policy",
    parentPersona: "journalist",
    label: "Policy Reporter",
    painPoint: "Wants to understand the policy implications and real-world impact of the findings.",
    quantitativeDepth: "low-medium",
    languageStyle: "Clear and authoritative, connecting findings to policy debates.",
  },

  // ── General ──
  general_curious: {
    id: "general_curious",
    parentPersona: "general",
    label: "Curious Reader",
    painPoint: "Interested in science but lacks domain expertise; wants the 'so what?' in everyday terms.",
    quantitativeDepth: "low",
    languageStyle: "Conversational, friendly, uses everyday analogies.",
  },
  general_investor: {
    id: "general_investor",
    parentPersona: "general",
    label: "Industry / Investor",
    painPoint: "Wants to evaluate commercial potential and market applications of the research.",
    quantitativeDepth: "medium",
    languageStyle: "Business-oriented, focused on applications, market size, and competitive advantage.",
  },
};
