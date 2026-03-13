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
 * Produces 4 story cards: What, Why, How, What To Do Now.
 */
export function composeSummaryPrompt(
  persona: SubPersona,
  contextText: string,
  opts?: {
    researcherContext?: string;
    contextFigure?: { id: string; caption: string; visual_description?: string };
  },
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
    exhaustive: "60–80",
    balanced: "40–60",
    executive: "25–40",
  };
  const wordRange = wordRangeMap[persona.depthPreference] || "40–60";

  // 5. Context figure instruction
  let contextFigureInstruction = "";
  if (opts?.contextFigure) {
    contextFigureInstruction = `\n\nCONTEXT FIGURE AVAILABLE:
- Figure ID: ${opts.contextFigure.id}
- Caption: ${opts.contextFigure.caption}
${opts.contextFigure.visual_description ? `- Visual description: ${opts.contextFigure.visual_description}` : ""}
In the "what" card, reference this figure conceptually — explain what it illustrates about the research idea/concept without citing specific numerical results. Set the "context_figure_id" field to "${opts.contextFigure.id}".`;
  }

  // 6. Researcher context instruction
  let researcherInstruction = "";
  if (opts?.researcherContext) {
    researcherInstruction = `\n\nRESEARCHER'S OWN WORK (for personalized "What To Do Now" card):
${opts.researcherContext}

For the "next" card: Compare this paper's contributions against the researcher's own work listed above. Identify synergies, gaps they could fill, or methods they could adopt. Make the next steps directly actionable for THIS researcher based on their existing body of work.`;
  }

  // 7. Summary Task — 4 story cards
  sections.push(`TASK: Create 4 story cards that narrate this research paper as a compelling story. Each card should be a concise, engaging paragraph (${wordRange} words each).${contextFigureInstruction}${researcherInstruction}

The 4 cards are:
1. "what" — THE DISCOVERY: What is this research about? Provide a broader conceptual look at the work. If a context figure is available, describe what it conceptually illustrates. Do NOT include specific numerical/scientific results. Focus on the big picture idea.
2. "why" — WHY IT MATTERS: What research gap does this close? Why should this reader care? Connect to real-world significance.
3. "how" — THE APPROACH: Brief methodology snapshot. What tools, techniques, or frameworks were used? Keep it accessible.
4. "next" — WHAT TO DO NOW: Actionable next steps for this reader.${opts?.researcherContext ? " Personalize based on the researcher's own work." : ""} What should they do with this knowledge?

Requirements:
- Each card body should be ${wordRange} words, flowing prose (NO bullet points, NO numbered lists)
- Tailor language and emphasis to what THIS reader cares about most
- Use the language style specified in the reader profile
- Include page references in parentheses where available, e.g., (p. 5)
- Each card links to the most relevant module

Return JSON:
{
  "cards": [
    { "slug": "what", "title": "The Discovery", "body": "...", "linked_module": "M1"${opts?.contextFigure ? ', "context_figure_id": "' + opts.contextFigure.id + '"' : ""} },
    { "slug": "why", "title": "Why It Matters", "body": "...", "linked_module": "M2" },
    { "slug": "how", "title": "The Approach", "body": "...", "linked_module": "M3" },
    { "slug": "next", "title": "What To Do Now", "body": "...", "linked_module": "M5" }
  ],
  "disclaimer": "This summary was generated by AI and may contain inaccuracies. Always refer to the original paper for definitive information."
}`);

  return sections.join("\n\n");
}
