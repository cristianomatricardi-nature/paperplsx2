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

  // 2. Module-Specific Adaptation
  const moduleInstruction = persona.moduleInstructions[moduleId];
  if (moduleInstruction) {
    sections.push(`MODULE-SPECIFIC ADAPTATION:\n${moduleInstruction}`);
  }

  // 3. Educational Extras
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
  sections.push(`TASK: Generate a "Key Insights" summary with exactly 4 bullet points. Each bullet point must:
1. Be tailored to what THIS reader cares about most
2. Include a page reference in parentheses, e.g., (p. 5)
3. Be concise (max 30 words per bullet)
4. Use the language style specified above

Also generate:
- A relevance_score (1-5 stars) indicating how relevant this paper is to the reader's role
- A one-sentence "why_this_matters" statement for this reader

Return JSON:
{
  "summary_points": ["point 1 (p. X)", "point 2 (p. Y)", "point 3 (p. Z)", "point 4 (p. W)"],
  "relevance_score": 4,
  "why_this_matters": "sentence"
}`);

  return sections.join("\n\n");
}
