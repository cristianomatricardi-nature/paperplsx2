import type { SubPersona } from "./sub-personas.ts";

/**
 * Compose a full module-generation prompt from persona registry + module schema.
 */
export function composeModulePrompt(
  persona: SubPersona,
  moduleId: string,
  contextText: string,
  moduleSchemaPrompt: string,
): string {
  const sections: string[] = [];

  // 1. Reader Profile
  sections.push(`READER PROFILE:
- Role: ${persona.label}
- Goal: ${persona.contentGoal}
- Numbers: ${persona.statisticsDisplay}
- Inferred data: ${persona.inferredDataPolicy}
- Language: ${persona.languageStyle} / Jargon: ${persona.jargonLevel}
- Detail level: ${persona.depthPreference}
- Compare against: ${persona.comparativeFraming}`);

  // 2. Quantitative Depth Mandate (conditional on numberPolicy)
  if (persona.numberPolicy === "all_raw" || persona.numberPolicy === "explained_raw") {
    sections.push(`QUANTITATIVE DEPTH MANDATE:
Extract and present EVERY quantitative result from the paper context. This includes but is not limited to: p-values, confidence intervals, effect sizes, sample sizes, means, standard deviations, R-squared, AUC, F1 scores, accuracy percentages, fold changes, hazard ratios, odds ratios, correlation coefficients, and any numerical comparisons. Present each as a separate entry in the statistics/metrics arrays — never collapse multiple numbers into prose. If the paper reports a number, it MUST appear in your output. When comparison data exists, include it in tabular format. A claim or impact section with fewer than 3 quantitative entries is likely missing data — go back and extract more.`);
  } else if (persona.numberPolicy === "inferred_only" || persona.numberPolicy === "decision_ready") {
    sections.push(`QUANTITATIVE PRESENTATION:
Translate raw statistics into practical significance for this reader. Instead of p-values, use confidence language (high/medium/low confidence). Instead of effect sizes, describe the magnitude in real-world terms. Only include numbers that are decision-relevant. If you infer population-level numbers, clearly mark them as AI-estimated.`);
  }

  // 3. Module-Specific Adaptation
  const moduleInstruction = persona.moduleInstructions[moduleId];
  if (moduleInstruction) {
    sections.push(`MODULE-SPECIFIC ADAPTATION:\n${moduleInstruction}`);
  }

  // 4. Educational Extras
  if (persona.educationalExtras) {
    sections.push(`EDUCATIONAL RESOURCES:\nSuggest relevant textbooks, tutorials, review papers, or protocol databases where applicable. Include links to foundational reading that would help a newcomer understand the context.`);
  }

  // 4. Broader Impact Assessment
  if (persona.broaderImpactAssessment) {
    sections.push(`BROADER IMPACT CHECK:\nHonestly assess whether this research has broader societal, economic, or policy impact at regional/national level. If not, state clearly: "This research does not have direct broader impact implications at this time." Do not fabricate relevance.`);
  }

  // 5. Disclaimers
  if (persona.disclaimers.length > 0) {
    sections.push(`REQUIRED DISCLAIMERS:\nInclude the following disclaimers where relevant:\n${persona.disclaimers.map((d) => `- ${d}`).join("\n")}`);
  }

  // 6. Paper Context
  sections.push(`PAPER CONTEXT (retrieved from the paper):\n${contextText}`);

  // 7. Module Schema
  sections.push(moduleSchemaPrompt);

  return sections.join("\n\n");
}

/**
 * Compose a summary-generation prompt using module-derived context.
 * The broader impact check is removed; the summary follows a What/Why/How narrative.
 */
export function composeSummaryPrompt(
  persona: SubPersona,
  contextText: string,
): string {
  const sections: string[] = [];

  // 1. Reader Profile
  sections.push(`READER PROFILE:
- Role: ${persona.label}
- Goal: ${persona.contentGoal}
- Numbers: ${persona.statisticsDisplay}
- Inferred data: ${persona.inferredDataPolicy}
- Language: ${persona.languageStyle} / Jargon: ${persona.jargonLevel}
- Detail level: ${persona.depthPreference}
- Compare against: ${persona.comparativeFraming}`);

  // 2. Disclaimers
  if (persona.disclaimers.length > 0) {
    sections.push(`REQUIRED DISCLAIMERS:\n${persona.disclaimers.map((d) => `- ${d}`).join("\n")}`);
  }

  // 3. Paper Context (from cached modules or abstract fallback)
  sections.push(`PAPER CONTEXT (extracted from structured analysis modules):\n${contextText}`);

  // 4. Dynamic word range based on depth preference
  const wordRangeMap: Record<string, string> = {
    exhaustive: "250–350",
    balanced: "180–250",
    executive: "120–160",
  };
  const wordRange = wordRangeMap[persona.depthPreference] || "180–250";

  // 5. Summary Task — What/Why/How narrative
  sections.push(`TASK: Write a personalized narrative summary of this research paper. The summary must follow this structure as a single flowing paragraph (NO bullet points, NO numbered lists, NO headers):

1. WHAT: Start with the key findings and core contribution of the research.
2. WHY: Explain the research gap this work closes and why it matters.
3. HOW: Briefly describe the methodological approach used.

Requirements:
- Target ${wordRange} words, single flowing paragraph
- Tailor the language and emphasis to what THIS reader cares about most
- Use the language style specified in the reader profile above
- Include page references in parentheses where available, e.g., (p. 5)
- Read as natural, engaging prose — not a list of facts

Return JSON:
{
  "narrative_summary": "Your flowing paragraph here (${wordRange} words)...",
  "disclaimer": "This summary was generated by AI and may contain inaccuracies. Always refer to the original paper for definitive information."
}`);

  return sections.join("\n\n");
}
