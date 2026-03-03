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
 * Compose a full summary-generation prompt from persona registry.
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

  // 2. Broader Impact Assessment (for summary too)
  if (persona.broaderImpactAssessment) {
    sections.push(`BROADER IMPACT CHECK:\nHonestly assess whether this research has broader societal, economic, or policy impact. If not, state clearly in your summary.`);
  }

  // 3. Disclaimers
  if (persona.disclaimers.length > 0) {
    sections.push(`REQUIRED DISCLAIMERS:\n${persona.disclaimers.map((d) => `- ${d}`).join("\n")}`);
  }

  // 4. Paper Context
  sections.push(`PAPER CONTEXT (retrieved from the paper):\n${contextText}`);

  // 5. Summary Task
  sections.push(`TASK: Write a personalized narrative summary of 150-200 words as a single flowing paragraph. The summary should:
1. Walk through the entire paper from motivation to key findings to implications
2. Be tailored to what THIS reader cares about most
3. Use the language style specified above
4. Include page references in parentheses where relevant, e.g., (p. 5)
5. Read as natural prose — no bullet points, no numbered lists

Return JSON:
{
  "narrative_summary": "Your 150-200 word flowing paragraph here..."
}`);

  return sections.join("\n\n");
}
