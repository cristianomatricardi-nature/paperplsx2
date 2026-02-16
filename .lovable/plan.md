

## Fix Shallow Quantitative Analysis for PhD/Post-doc Persona

### Root Cause

The problem is **not** in the persona instructions — it's in two places working together:

1. **MODULE_PROMPTS JSON schemas** provide minimalist examples that the LLM mimics. For example, M2 shows `"statistics": [{ "name": "p-value", "value": "0.001" }]` — just one stat. The LLM takes this as "give one or two stats" rather than exhaustively extracting every number.

2. **The prompt composer** includes the persona's `statisticsDisplay` instruction as a single line in the READER PROFILE header, but never enforces it with a strong directive tied to `numberPolicy`. The LLM treats it as a suggestion, not a mandate.

The frontend renderers (ClaimCard, MetricsTable) already handle rich data — they auto-render any number of statistics badges and dynamically detect table columns. No frontend changes needed.

### Changes

#### 1. Enrich MODULE_PROMPTS schemas (`generate-module-content/index.ts`)

**M1 (Contribution and Impact)**: Expand the `metrics` array example to show multiple rows with richer fields, and add a `quantitative_highlights` section:

```text
"metrics": [
  { "metric": "name", "value": "number/range", "comparison": "vs prior work", "page_ref": 5 },
  { "metric": "second metric", "value": "number", "comparison": "context", "page_ref": 7 }
],
"quantitative_highlights": "Narrative paragraph summarizing ALL key numbers from the paper: sample sizes, effect sizes, performance gains, etc."
```

**M2 (Claims and Evidence)**: Expand the `statistics` array example and add explicit instruction to extract ALL statistics per claim:

```text
"statistics": [
  { "name": "p-value", "value": "<0.001" },
  { "name": "effect size (Cohen's d)", "value": "0.82" },
  { "name": "95% CI", "value": "[0.45, 1.19]" },
  { "name": "sample size", "value": "n=342" },
  { "name": "power", "value": "0.95" }
],
```

Add to the M2 prompt instruction: "Extract EVERY quantitative result reported for each claim — p-values, confidence intervals, effect sizes, sample sizes, power, R-squared, AUC, accuracy, F1, or any other reported metric. Do not summarize numbers into text — list each one explicitly in the statistics array."

**M3 (Methods)**: Add a `quantitative_parameters` field to protocol steps for numerical specs (concentrations, temperatures, durations, RPMs, etc.).

#### 2. Add quantitative enforcement to the composer (`prompt-composers.ts`)

Add a new conditional section in `composeModulePrompt` based on `numberPolicy`:

- When `numberPolicy` is `"all_raw"` or `"explained_raw"`: inject a **QUANTITATIVE DEPTH MANDATE** section:

```text
QUANTITATIVE DEPTH MANDATE:
Extract and present EVERY quantitative result from the paper context. This includes but is not limited to: p-values, confidence intervals, effect sizes, sample sizes, means, standard deviations, R-squared, AUC, F1 scores, accuracy percentages, fold changes, hazard ratios, odds ratios, correlation coefficients, and any numerical comparisons. Present each as a separate entry in the statistics/metrics arrays — never collapse multiple numbers into prose. If the paper reports a number, it MUST appear in your output. When comparison data exists, include it in tabular format.
```

- When `numberPolicy` is `"inferred_only"` or `"decision_ready"`: inject a different directive that says to translate or omit raw statistics.

#### 3. Strengthen phd_postdoc persona instructions (`sub-personas.ts`)

Update `phd_postdoc` metadata:
- Change `depthPreference` from `"balanced"` to `"exhaustive"` — they need every detail
- Update `statisticsDisplay` to be more demanding: "Present ALL reported statistics: p-values, confidence intervals, effect sizes, sample sizes, and any performance metrics. Include detailed comparison tables. Explain what each number means in context. Never omit a number — if the paper reports it, include it."
- Strengthen `moduleInstructions.M2` to explicitly demand exhaustive statistics extraction and comparison tables

#### 4. Update the `phd_postdoc` module instructions

Revise the M1 and M2 instructions to be more explicit about quantitative demands:

**M1**: Add "Include a comprehensive metrics table comparing this paper's quantitative results against prior work. Every number matters — sample sizes, effect magnitudes, statistical thresholds."

**M2**: Add "For each claim, extract EVERY reported statistic into the statistics array as individual entries. Build detailed comparison tables where the paper compares against baselines or prior methods. Present effect sizes, confidence intervals, p-values, sample sizes, and any performance benchmarks as separate labeled entries. A claim card with fewer than 3 statistics entries is likely missing data."

### Files Changed

| File | Change |
|------|--------|
| `supabase/functions/generate-module-content/index.ts` | Enrich MODULE_PROMPTS M1, M2, M3 JSON schemas with richer quantitative examples |
| `supabase/functions/_shared/prompt-composers.ts` | Add QUANTITATIVE DEPTH MANDATE section conditional on numberPolicy |
| `supabase/functions/_shared/sub-personas.ts` | Update phd_postdoc: depthPreference to exhaustive, stronger statisticsDisplay, stronger M1/M2 moduleInstructions |

### What This Achieves

- The **schema examples** now show the LLM what "rich quantitative output" looks like (5+ stats per claim, multi-row metrics tables)
- The **numberPolicy-based mandate** forces exhaustive extraction for researcher personas while keeping other personas appropriately concise
- The **persona instructions** reinforce this at the module level with specific demands ("fewer than 3 statistics = missing data")
- No frontend changes needed — ClaimCard and MetricsTable already render any amount of data

### Cache Cleanup

After deploying, clear stale cached content:

```sql
DELETE FROM generated_content_cache WHERE content_type IN ('module', 'summary');
```
