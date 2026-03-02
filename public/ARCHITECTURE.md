# Paper++ Architecture Guide

> Last updated: March 2026
>
> This document is the definitive guide to Paper++'s architecture — covering the full pipeline
> from PDF upload to persona-tailored visualization, the Digital Lab, Replication Assistant,
> Analytical Pipeline, and all known limitations.

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Pipeline: From PDF to Knowledge Object](#2-pipeline-from-pdf-to-knowledge-object)
3. [The Structured Paper Schema](#3-the-structured-paper-schema)
4. [RAG Layer](#4-rag-layer)
5. [Figure Extraction](#5-figure-extraction)
6. [Persona System](#6-persona-system)
7. [Module Framework (M1–M6)](#7-module-framework-m1m6)
8. [Prompt Composition](#8-prompt-composition)
9. [Personalized Summaries](#9-personalized-summaries)
10. [Visualization Paradigms](#10-visualization-paradigms)
11. [Policy Maker Liquefaction](#11-policy-maker-liquefaction)
12. [Digital Lab](#12-digital-lab)
13. [Replication Assistant](#13-replication-assistant)
14. [Analytical Pipeline](#14-analytical-pipeline)
15. [Caching Strategy](#15-caching-strategy)
16. [Known Limitations and Issues](#16-known-limitations-and-issues)
17. [Database Tables](#17-database-tables)
18. [Edge Functions Map](#18-edge-functions-map)
19. [Routes Map](#19-routes-map)

---

## 1. System Overview

Paper++ transforms static scientific PDFs into interactive, persona-tailored knowledge objects.
The system has three product pillars, all connected through the same paper data:

```
┌──────────────────────────────────────────────────────────────────┐
│                        PAPER++ PLATFORM                         │
├──────────────────┬────────────────────┬──────────────────────────┤
│                  │                    │                          │
│  Paper++         │  Digital Lab       │  Replication             │
│  Generator       │                    │  Assistant               │
│                  │                    │                          │
│  PDF → Structure │  CRUD inventory    │  Gap analysis            │
│  → RAG → Modules │  of lab equipment, │  Experiment planner      │
│  → Persona views │  reagents,         │  Agentic resource        │
│                  │  software          │  planning                │
│                  │                    │  Lab simulation           │
├──────────────────┴────────────────────┴──────────────────────────┤
│                     Analytical Pipeline                          │
│        Decision point decomposition & sensitivity analysis       │
├─────────────────────────────────────────────────────────────────-┤
│                     SHARED DATA LAYER                            │
│  papers │ structured_papers │ chunks │ generated_content_cache   │
│  digital_lab_inventory │ user_activity_events │ paper_api_keys   │
└──────────────────────────────────────────────────────────────────┘
```

### How They Connect

- **Paper++ Generator** produces the `structured_papers` record and `chunks` that feed everything else.
- **Digital Lab** stores what equipment a researcher has. This inventory feeds into the **Replication Assistant**.
- **Replication Assistant** compares paper methods (from `structured_papers.methods`) against lab inventory to find gaps, then uses AI planning to suggest resource acquisition and experiment design.
- **Analytical Pipeline** takes selected claims, methods, and figures from a paper and decomposes the analytical decisions into an interactive "what-if" sensitivity analysis.

### Technology Stack

| Layer      | Technology                                         |
| ---------- | -------------------------------------------------- |
| Frontend   | React 18 + TypeScript + Vite + Tailwind CSS        |
| UI library | shadcn/ui (Radix primitives + Tailwind)            |
| State      | React Query (TanStack) + local React state         |
| Backend    | Supabase (Postgres + Edge Functions + Storage)     |
| AI models  | OpenAI GPT-4o (structuring, modules, policy view)  |
|            | OpenAI GPT-4o-mini (summaries, impact scores, lab) |
|            | OpenAI text-embedding-3-small (1536-dim vectors)   |
|            | OpenAI DALL-E 3 (policy infographics)              |
|            | Lovable AI Gateway / Gemini (agentic planning)     |
| PDF parse  | pdfjs-serverless (server-side text extraction)      |

---

## 2. Pipeline: From PDF to Knowledge Object

When a user uploads a PDF or enters a DOI, the system executes a 5-stage pipeline managed
by the `orchestrate-pipeline` edge function. The orchestrator uses a **fire-and-poll** pattern:
it dispatches each stage as a separate edge function call, then polls the database for completion
signals before moving to the next stage.

```
┌──────────┐    ┌──────────┐    ┌──────────────┐    ┌────────────────────┐    ┌───────────────────┐
│  UPLOAD  │───>│  PARSE   │───>│  STRUCTURE   │───>│  CHUNK & EMBED     │───>│  SIMULATED        │
│          │    │          │    │              │    │  + FIGURE EXTRACT  │    │  IMPACT           │
│ upload-  │    │ run-     │    │ run-         │    │  (parallel)        │    │                   │
│ handler  │    │ parser   │    │ structuring  │    │                    │    │ generate-         │
│ or doi-  │    │          │    │              │    │ run-chunking-and-  │    │ simulated-impact  │
│ resolver │    │          │    │              │    │ embedding          │    │                   │
│          │    │          │    │              │    │ run-figure-        │    │                   │
│          │    │          │    │              │    │ extraction         │    │                   │
└──────────┘    └──────────┘    └──────────────┘    └────────────────────┘    └───────────────────┘
     │               │                │                      │                        │
     ▼               ▼                ▼                      ▼                        ▼
  papers          temp/            structured_          chunks table            papers.simulated_
  table           {id}/            papers              (with embeddings)       impact_scores
  created         parsed.json      table                                       updated
```

### Stage Details

#### Stage 1: Upload (`upload-handler` or `doi-resolver`)

**PDF Upload path:**
- Validates file is PDF, ≤ 20 MB
- Authenticates user from JWT
- Uploads to `research-papers` storage bucket at path `{user_id}/{timestamp}_{filename}`
- Inserts a `papers` row with `status = 'uploaded'`
- Fire-and-forget: calls `orchestrate-pipeline`

**DOI path:**
- Queries Unpaywall API for open-access PDF URL
- Downloads PDF, uploads to storage
- Extracts metadata (title, authors, journal) from Unpaywall response
- Same pipeline trigger

#### Stage 2: Parse (`run-parser`)

- Downloads PDF from storage
- Uses `pdfjs-serverless` to extract text page-by-page
- Produces a `page_map` object: `{ 1: "text...", 2: "text...", ... }`
- Saves result as `temp/{paper_id}/parsed.json` in storage
- Updates `papers.num_pages`
- **Completion signal:** `papers.num_pages IS NOT NULL`

#### Stage 3: Structure (`run-structuring`)

- Downloads `parsed.json` from storage
- Constructs a prompt with page-annotated text: `--- PAGE 1 ---\n{text}\n\n--- PAGE 2 ---\n...`
- Calls **GPT-4o** with `temperature: 0.1`, `response_format: { type: "json_object" }`, `max_tokens: 16000`
- Uses a detailed system prompt (the "Master Structuring Prompt") that defines the exact JSON schema
- Parses the response and upserts into `structured_papers`
- Also updates `papers` metadata (title, authors, abstract, doi, journal, publication_date)
- **Completion signal:** `structured_papers.sections` is a non-empty array

#### Stage 4a: Chunk & Embed (`run-chunking-and-embedding`)

- Reads `structured_papers` record
- Creates typed chunks from each structured element (see [RAG Layer](#4-rag-layer))
- Generates embeddings in batches of 20 using `text-embedding-3-small`
- Deletes any existing chunks for idempotency, then inserts new ones
- **Completion signal:** `chunks` table has rows for this `paper_id`

#### Stage 4b: Figure Extraction (`run-figure-extraction`) — runs in parallel with 4a

- Reads `structured_papers.figures` for caption/page info
- Downloads the original PDF, encodes as base64
- Sends to **GPT-4o** via the Responses API with the PDF as an inline file
- Asks for bounding box coordinates (fractional 0–1) for each figure
- Falls back to full-page bounding box if detection fails
- Updates `structured_papers.figures` with `bounding_box` data
- **Non-blocking:** orchestrator does not wait for this to finish

#### Stage 5: Simulated Impact (`generate-simulated-impact`)

- Reads `structured_papers` metadata, claims, methods, and call-to-actions
- Calls **GPT-4o-mini** to generate 6 impact dimension scores (1–10):
  - `conceptual_influence`
  - `methodological_adoption`
  - `policy_relevance`
  - `industry_transfer_potential`
  - `educational_value`
  - `replication_readiness`
- Each score includes a reasoning string
- Saves to `papers.simulated_impact_scores`
- **Completion signal:** `papers.simulated_impact_scores IS NOT NULL`

### Pipeline Status Tracking

The `papers.status` column progresses through these values:
`uploaded → parsing → structuring → chunking → extracting_figures → completed`

If any stage fails, status is set to `failed` with an `error_message`. The frontend
uses Supabase Realtime to subscribe to `papers` changes and show a live progress bar.

### Timeouts

Each polling step has a 5-minute timeout (2 minutes for simulated impact). If exceeded,
the pipeline marks the paper as failed.

---

## 3. The Structured Paper Schema

The `run-structuring` function extracts 12 distinct element types from every paper.
These are stored as JSON columns in the `structured_papers` table.

| Element           | Column             | What it captures                                                        |
| ----------------- | ------------------ | ----------------------------------------------------------------------- |
| Metadata          | `metadata`         | Title, authors (name/affiliation/ORCID), DOI, journal, date, field      |
| Abstract          | `abstract`         | Full abstract text                                                      |
| Sections          | `sections`         | Every section with heading, level, full content, page numbers           |
| Claims            | `claims`           | Each claim with evidence summary, strength rating, supporting data      |
| Methods           | `methods`          | Individual protocol steps with tools, reagents, software, conditions    |
| Figures           | `figures`          | Caption, type, description, key findings, data series descriptions      |
| Tables            | `tables_data`      | Caption, headers, summary, page number                                  |
| Equations         | `equations`        | Raw text, context, page number                                          |
| Negative Results  | `negative_results` | Description, hypothesis tested, why it matters                          |
| Call to Actions   | `call_to_actions`  | Action, target audience, urgency level                                  |
| SciComm Hooks     | `scicomm_hooks`    | Hook type (analogy/real-world/surprising/human story), content, audience |
| References        | `references_list`  | Title, authors, year, DOI, how it's used in the paper                   |
| Author Enrichments| `author_enrichments`| User-added enrichment data about authors (separate from AI extraction)  |

### Method Granularity

The structuring prompt explicitly instructs GPT-4o to break methods into **individual steps**:

> "Extract EVERY INDIVIDUAL method step as a SEPARATE entry. Break complex procedures
> into their distinct sub-steps. A typical experimental paper has 5–15 method steps."

Each method step includes a `depends_on` array linking to prerequisite step IDs,
enabling the frontend to render a protocol flow diagram.

### Claim Strength Scale

| Strength      | Meaning                                    |
| ------------- | ------------------------------------------ |
| `strong`      | Robust statistical support, replicated     |
| `moderate`    | Reasonable evidence, some caveats          |
| `preliminary` | Initial findings, needs further validation |
| `speculative` | Hypothesis-level, minimal direct evidence  |

### SciComm Hook Types

| Type                | Purpose                                    |
| ------------------- | ------------------------------------------ |
| `analogy`           | Explains a concept via everyday comparison |
| `real_world_impact` | Connects findings to tangible outcomes     |
| `surprising_finding`| Highlights counterintuitive results        |
| `human_story`       | Narrative angle for media/public interest  |

---

## 4. RAG Layer

The RAG (Retrieval-Augmented Generation) layer sits between the structured paper and
the AI-generated module content. It enables context-aware, relevant content generation
without passing the entire paper text to every AI call.

### How Chunks Are Created

`run-chunking-and-embedding` reads the `structured_papers` record and creates typed chunks:

| Chunk Type           | Source                   | Module Relevance Scores (M1–M6)         |
| -------------------- | ------------------------ | ---------------------------------------- |
| `abstract`           | `structured_papers.abstract`     | M1:0.9, M2:0.5, M3:0.3, M4:0.3, M5:0.5, M6:0.8 |
| `context`            | Section text (~500 tokens each)  | M1:0.5, M2:0.5, M3:0.3, M4:0.3, M5:0.3, M6:0.4 |
| `claim`              | Each claim                       | M1:0.7, M2:0.95, M3:0.1, M4:0.3, M5:0.4, M6:0.5 |
| `method_step`        | Each method                      | M1:0.1, M2:0.2, M3:0.95, M4:0.1, M5:0.1, M6:0.2 |
| `figure_description` | Each figure                      | M1:0.5, M2:0.7, M3:0.3, M4:0.3, M5:0.2, M6:0.6 |
| `negative_result`    | Each negative result             | M1:0.2, M2:0.4, M3:0.1, M4:0.95, M5:0.3, M6:0.3 |
| `call_to_action`     | Each CTA                         | M1:0.4, M2:0.2, M3:0.1, M4:0.2, M5:0.95, M6:0.5 |
| `scicomm_hook`       | Each scicomm hook                | M1:0.3, M2:0.2, M3:0.1, M4:0.1, M5:0.3, M6:0.95 |

**Key insight:** Each chunk type has a pre-assigned relevance weight for each module.
For example, `claim` chunks are highly relevant to M2 (Claim & Evidence) but barely
relevant to M3 (Methods). This enables module-filtered retrieval.

### Section Chunking Strategy

Sections are split into ~500-token chunks at paragraph boundaries (double newlines).
Token estimation is rough: `chars / 4`. If a paragraph would push a chunk over 500 tokens,
the current chunk is finalized and a new one starts.

### Embedding Model

- **Model:** `text-embedding-3-small` (OpenAI)
- **Dimensions:** 1536
- **Batch size:** 20 chunks per API call
- **Insert batch size:** 50 rows per DB insert

### The `match_chunks` RPC

Chunk retrieval is done via a Postgres function `match_chunks` that performs vector similarity
search using the `<=>` operator (cosine distance). Parameters:

| Parameter           | Type    | Description                                      |
| ------------------- | ------- | ------------------------------------------------ |
| `p_paper_id`        | integer | Which paper to search within                     |
| `p_query_embedding` | text    | JSON-serialized 1536-dim vector                  |
| `p_match_threshold` | float   | Minimum cosine similarity (default 0.5)          |
| `p_match_count`     | integer | Max chunks to return (default 15)                |
| `p_module_id`       | text    | Optional: filter by `module_relevance[module] > 0.5` |

Returns chunks sorted by similarity score, including content, page numbers, and source IDs.

### Multi-Tier Fallback Strategy

When generating module content, RAG retrieval uses a cascading threshold strategy:

1. **Tier 1:** `threshold = 0.5`, with module filter (`p_module_id = 'M2'`)
2. **Tier 2:** If no results → `threshold = 0.2`, **no** module filter
3. **Tier 3:** If still nothing → `threshold = 0.05`, no module filter

For summary generation, only two tiers are used (0.5 → 0.2).

This ensures that even poorly-embedded or unusual papers produce some context,
at the cost of potentially lower relevance in the fallback tiers.

---

## 5. Figure Extraction

Figure extraction is the process of locating figures in the original PDF and making
them available as cropped images.

### How It Works

1. `run-structuring` identifies figures from text (captions, descriptions) and stores them
   in `structured_papers.figures` with metadata but **no image data**.

2. `run-figure-extraction` then:
   - Downloads the original PDF
   - Encodes it as base64
   - Sends it to GPT-4o via the **Responses API** (with inline file support)
   - Asks the model to locate each figure and return bounding box coordinates

3. Bounding boxes are stored as fractional coordinates (0–1):
   ```json
   { "x": 0.1, "y": 0.2, "width": 0.8, "height": 0.4 }
   ```

4. The frontend uses PDF.js to render the relevant page and **raster-crops** the figure
   using the bounding box coordinates on a canvas element.

### Retry Logic

If GPT-4o refuses to process the PDF (common with certain document formats), the function
retries with a stronger prompt prefix. If both attempts fail, a full-page fallback bounding
box is used: `{ x: 0.05, y: 0.05, width: 0.9, height: 0.9 }`.

### Current Limitations

| Limitation | Description |
| --- | --- |
| **Static images only** | Figures are rendered as raster crops from the PDF canvas. There is no data extraction — a bar chart is just a picture, not interactive data. |
| **No data point extraction** | The system cannot extract X/Y values, axis labels, or legend entries from figures. Users cannot re-plot or interact with figure data. |
| **Bounding box accuracy** | GPT-4o's bounding box detection is approximate. Subfigures (Fig 2a, 2b) may be grouped or mis-bounded. |
| **Full-page fallback** | When detection fails, the user sees an entire page instead of a focused figure. |
| **No vector/SVG output** | All output is rasterized at the PDF page resolution. No vector graphics. |

---

## 6. Persona System

Paper++ uses a **dual-registry architecture** for personas, with a clear separation between
frontend display needs and backend AI behavioral configuration.

### Two-Level Hierarchy

```
Parent Persona (5 total)          Sub-Persona (8 total)
─────────────────────────         ─────────────────────
Researcher                   ──── phd_postdoc
                              └── pi_tenure
Policy Maker                 ──── think_tank
                              └── gov_institution
Funding Agency               ──── funder_governmental
                              └── funder_private
Industry R&D                 ──── industry_rd
AI Agent                     ──── ai_agent
```

**Parent personas** determine the **visualization paradigm** — the entire layout and
component structure of the paper view. For example, `Researcher` shows modular accordions,
while `Policy Maker` shows a dashboard with evidence strip and policy brief.

**Sub-personas** determine the **AI content behavior** — how text is written, what statistics
are shown, what jargon level is used, which disclaimers are included.

### Frontend Registry (`src/types/modules.ts`)

The frontend `SubPersonaDefinition` has minimal fields focused on display:

```typescript
interface SubPersonaDefinition {
  id: SubPersonaId;
  parentPersona: string;       // e.g., 'Researcher'
  label: string;               // e.g., 'PhD Student / Post-doc'
  shortLabel: string;          // e.g., 'PhD/Post-doc'
  painPoint: string;           // User's primary frustration
  numberPolicy: string;        // How numbers should be presented
  statisticsDisplay: string;   // Brief description of stats approach
  languageStyle: string;       // Tone description
  moduleOrder: ModuleId[];     // Priority order of M1–M6
}
```

### Backend Registry (`supabase/functions/_shared/sub-personas.ts`)

The backend `SubPersona` has 14 fields that drive prompt composition:

```typescript
interface SubPersona {
  id: string;
  parentPersona: string;
  label: string;
  painPoint: string;
  numberPolicy: 'all_raw' | 'explained_raw' | 'narrative_only' | 'inferred_only' | 'decision_ready';
  statisticsDisplay: string;
  inferredDataPolicy: string;          // Whether/how to infer numbers not in the paper
  jargonLevel: 'define_all' | 'assume_domain' | 'no_jargon' | 'business_terms';
  languageStyle: string;
  contentGoal: string;                 // What this reader wants from the paper
  depthPreference: 'exhaustive' | 'balanced' | 'executive';
  comparativeFraming: string;          // How to frame comparisons
  educationalExtras: boolean;          // Whether to suggest textbooks, tutorials
  broaderImpactAssessment: boolean;    // Whether to assess societal impact
  disclaimers: string[];               // Required disclaimers to include
  moduleInstructions: Record<string, string>;  // Per-module behavioral instructions
}
```

### The Key Difference

The frontend registry is used **only** for UI display — showing persona options, labels,
and module ordering. The backend registry drives **all** AI content generation. They are
maintained as separate files because:

1. The frontend does not need 14 fields to render a persona selector
2. The backend needs detailed behavioral instructions that would bloat the frontend bundle
3. They can evolve independently (e.g., adding a new disclaimer to a persona)

### Parent Persona Registry (`supabase/functions/_shared/parent-personas.ts`)

A third registry exists at the parent level, defining the **visualization paradigm**
and **liquefaction configuration** for each parent persona:

```typescript
interface ParentPersonaConfig {
  id: string;
  visualizationType: 'researcher_modules' | 'policy_dashboard' | 'roi_dashboard' | 'tech_scouting' | 'api_console';
  primaryModules: string[];            // Modules displayed prominently
  secondaryModules: string[];          // Modules displayed in supporting sections
  liquefactionInputModules: string[];  // Which cached modules feed the liquefaction prompt
  liquefactionPrompt: (paper, modulesContent) => string;  // Prompt builder
}
```

### Module Ordering by Sub-Persona

Each sub-persona defines a priority order for the 6 modules. This order determines
which modules appear first in the accordion view (Researcher) or which are fetched
for the dashboard (Policy Maker).

| Sub-Persona         | Module Order                         | Primary Focus           |
| ------------------- | ------------------------------------ | ----------------------- |
| `phd_postdoc`       | M1, M2, M3, M4, M5, M6              | Balanced, learning-oriented |
| `pi_tenure`         | M2, M1, M3, M5, M4, M6              | Evidence-first, strategic |
| `think_tank`        | M1, M5, M2, M6, M3, M4              | Impact + actions first   |
| `gov_institution`   | M1, M5, M6, M2, M4, M3              | Bottom-line + communication |
| `funder_governmental`| M1, M2, M5, M3, M4, M6             | Contribution + evidence  |
| `funder_private`    | M1, M5, M2, M3, M4, M6              | Impact + mission alignment |
| `industry_rd`       | M2, M3, M1, M5, M4, M6              | Evidence + methods first |
| `ai_agent`          | M1, M2, M3, M4, M5, M6              | Sequential, machine-readable |

### Frontend Mapping

`PARENT_PERSONA_MAP` in `src/lib/constants.ts` maps each sub-persona to its parent:

```typescript
export const PARENT_PERSONA_MAP: Record<SubPersonaId, string> = {
  phd_postdoc: 'Researcher',
  pi_tenure: 'Researcher',
  think_tank: 'Policy Maker',
  gov_institution: 'Policy Maker',
  // ...
};
```

This is used by `PaperViewPage` to switch the visualization paradigm.

---

## 7. Module Framework (M1–M6)

Paper++ organizes paper content into 6 self-contained knowledge "lenses" called modules.
Each module covers the **entire paper** from a specific angle — they overlap in source
material but differ in framing, depth, and focus.

### Module Definitions

| ID | Key                    | Title                                     | Tier      | Focus                                          |
| -- | ---------------------- | ----------------------------------------- | --------- | ----------------------------------------------- |
| M1 | `contribution_impact`  | Contribution & Impact Statement           | Core      | What's new, field impact, prior work comparison |
| M2 | `claim_evidence`       | Claim & Evidence Unit                     | Core      | Each claim graded by evidence strength          |
| M3 | `method_protocol`      | Method & Protocol Card                    | Core      | Step-by-step replication protocol               |
| M4 | `exploratory_negative` | Exploratory & Negative Results Archive    | Satellite | What didn't work, limitations, dead ends        |
| M5 | `call_to_action`       | Call-to-Actions                           | Satellite | Next steps, policy/industry recommendations     |
| M6 | `scicomm`              | SciComms                                  | Satellite | Plain-language summaries, analogies, social media|

**Core** modules cover the paper's primary scientific content.
**Satellite** modules cover surrounding context and communication.

### Self-Contained Design

Each module follows a 3-layer narrative structure:

1. **Context Bridge** (2–3 sentences): Frames the paper's topic so this module makes sense
   in isolation. If you only read M3, you still know what problem is being solved.

2. **Focal Content**: The module's main analysis — unique to this lens. M1 shows metrics
   tables, M2 shows graded claim cards, M3 shows protocol steps, etc.

3. **Cross-Reference Pointers** (1–2 sentences): Briefly acknowledges that related depth
   exists in other modules. "For detailed evidence, see the Claims module." Never duplicates.

### How `generate-module-content` Works

This is the core edge function. Here is the exact sequence:

```
1. Receive { paper_id, module_id, sub_persona_id }
         │
2. CHECK CACHE ─── hit? ──── return cached JSON immediately
         │ miss
3. Look up MODULE_QUERIES[module_id]
   (a tailored retrieval query string per module)
         │
4. Embed the query using text-embedding-3-small
         │
5. Call match_chunks with module-filtered retrieval
   ├── Tier 1: threshold=0.5, module_id filter
   ├── Tier 2: threshold=0.2, no filter
   └── Tier 3: threshold=0.05, no filter
         │
6. Build context text: "[Page X,Y] chunk content" joined with \n\n
         │
7. Call composeModulePrompt(subPersona, moduleId, contextText, moduleSchemaPrompt)
   This produces the full prompt (see §8 Prompt Composition)
         │
8. Call GPT-4o with temperature=0.2
         │
9. Parse JSON response (strips markdown fences if present)
         │
10. CACHE the result in generated_content_cache
    key = (paper_id, 'module', sub_persona_id, module_id)
         │
11. Return JSON to frontend
```

### Module-Specific Retrieval Queries

Each module has a tailored query string used for embedding-based retrieval:

| Module | Query (summarized)                                                    |
| ------ | --------------------------------------------------------------------- |
| M1     | introduction, background, motivation, contribution, novelty, key results |
| M2     | results, findings, statistical analysis, evidence, claims, methodology  |
| M3     | methods, protocols, experimental setup, tools, reagents, software       |
| M4     | negative results, null findings, limitations, failed approaches         |
| M5     | future work, recommendations, conclusions, collaboration               |
| M6     | abstract, key results, real world applications, analogies               |

### Module Output Schemas

Each module produces a JSON object with a `tabs` wrapper. The exact structure varies per module.
For example:

**M1 (Contribution & Impact):**
```json
{
  "tabs": {
    "introduction": { "context_bridge": "...", "module_focus": "...", "cross_references": "..." },
    "overview": { "core_contribution": "...", "novelty_statement": "..." },
    "impact_analysis": {
      "field_impact": "...",
      "broader_impact": "...",
      "metrics": [{ "metric": "...", "value": "...", "comparison": "...", "page_ref": 5 }],
      "quantitative_highlights": "..."
    },
    "prior_work_comparison": { "before": "...", "after": "...", "key_differences": ["..."] }
  }
}
```

**M2 (Claims):**
```json
{
  "tabs": {
    "introduction": { "context_bridge": "...", "module_focus": "...", "cross_references": "..." },
    "claims": [
      {
        "id": "claim_1",
        "statement": "...",
        "strength": "strong",
        "evidence": "...",
        "statistics": [{ "name": "p-value", "value": "<0.001" }],
        "figure_refs": ["fig_1"],
        "page_refs": [5, 6]
      }
    ],
    "evidence_summary": { "total_claims": 5, "strong": 2, "moderate": 2, "preliminary": 1 }
  }
}
```

**M3 (Methods):**
```json
{
  "tabs": {
    "protocol_steps": [
      {
        "step_number": 1,
        "title": "...",
        "tools": ["..."],
        "reagents": ["..."],
        "quantitative_parameters": [{ "parameter": "...", "value": "...", "page_ref": 4 }],
        "critical_notes": ["..."]
      }
    ],
    "reproducibility": { "score": 7, "strengths": ["..."], "gaps": ["..."] }
  }
}
```

---

## 8. Prompt Composition

The `prompt-composers.ts` file in `_shared/` contains two functions that compose the
prompts sent to OpenAI: `composeModulePrompt` and `composeSummaryPrompt`.

### The 7-Section Module Prompt Architecture

`composeModulePrompt(persona, moduleId, contextText, moduleSchemaPrompt)` builds a
prompt from these sections:

| Section | What it contains | Conditional? |
| --- | --- | --- |
| 1. Reader Profile | Role, goal, statistics preference, inferred data policy, language style, depth preference, comparative framing | Always |
| 2. Quantitative Depth Mandate | Detailed instructions for number presentation. Two modes: "extract every number" (for `all_raw`/`explained_raw`) or "translate to practical significance" (for `inferred_only`/`decision_ready`) | Conditional on `numberPolicy` |
| 3. Module-Specific Adaptation | The per-module behavioral instruction from `persona.moduleInstructions[moduleId]` | Only if instruction exists for this module |
| 4. Educational Extras | Instructions to suggest textbooks, tutorials, review papers | Only if `persona.educationalExtras === true` |
| 5. Broader Impact Assessment | Instructions to honestly assess societal/policy impact, or state "no direct impact" | Only if `persona.broaderImpactAssessment === true` |
| 6. Required Disclaimers | Specific disclaimer text to include (e.g., "AI-inferred estimate") | Only if `persona.disclaimers.length > 0` |
| 7. Paper Context | The RAG-retrieved chunks, formatted as `[Page X,Y] content` | Always |
| 8. Module Schema | The full JSON schema prompt from `MODULE_PROMPTS[moduleId]` | Always |

### Example: How Persona Affects Output

For the same paper and module (M2, Claims), the prompt composition differs dramatically:

**PhD/Post-doc (`phd_postdoc`):**
- Reader Profile: "Clear, educational, encouraging. Define technical terms."
- Quantitative Depth: "Present ALL reported statistics... explain what each number means."
- Module Instruction: "Build detailed comparison tables... A claim card with fewer than 3 statistics is likely missing data."
- Disclaimers: (none)

**Government Official (`gov_institution`):**
- Reader Profile: "Jargon-free, executive-summary style. Short sentences."
- Quantitative Depth: "Translate to practical significance... use confidence language."
- Module Instruction: "Present claims as decision-ready statements. Use confidence language ('high confidence' rather than 'p < 0.001')."
- Disclaimers: "AI-inferred impact estimates are not stated in the paper."

The same RAG chunks produce radically different output because the persona wrapping changes.

---

## 9. Personalized Summaries

The `generate-summary` edge function produces a 4-bullet "Key Insights" summary
tailored to the reader's sub-persona.

### How It Works

1. Check cache: `(paper_id, 'summary', sub_persona_id)`
2. Look up sub-persona in `SUB_PERSONA_REGISTRY`
3. Embed a fixed query: `"Key findings and main contributions of this research paper"`
4. Retrieve top-12 chunks via `match_chunks` (threshold 0.5 → fallback 0.2)
5. Call `composeSummaryPrompt(persona, contextText)` — uses 5-section prompt:
   - Reader Profile
   - Broader Impact Assessment (if enabled)
   - Disclaimers
   - Paper Context
   - Summary Task (exact 4-bullet + relevance score + why_this_matters)
6. Call **GPT-4o-mini** with `temperature: 0.3`
7. Parse JSON response, cache, return

### Output Schema

```json
{
  "summary_points": [
    "Point 1 with page reference (p. 5)",
    "Point 2 (p. 8)",
    "Point 3 (p. 3)",
    "Point 4 (p. 12)"
  ],
  "relevance_score": 4,
  "why_this_matters": "One sentence explaining why this paper matters to THIS reader"
}
```

### Fallback

If AI generation fails entirely, the function returns a generic fallback using the
paper's abstract and title — clearly marked as non-personalized.

---

## 10. Visualization Paradigms

The frontend uses a **parent persona dispatcher** pattern in `PaperViewPage.tsx`
to render different layouts based on who is reading.

### The Dispatch Logic

```typescript
const parentPersona = PARENT_PERSONA_MAP[subPersonaId];

switch (parentPersona) {
  case 'AI Agent':
    return <AiAgentConsole />;
  case 'Policy Maker':
    return <PolicyMakerView />;
  default:
    // 'Researcher', and future fallback for 'Funding Agency' / 'Industry R&D'
    return <ResearcherView />;
}
```

### Researcher View (`ResearcherView.tsx`)

The default and most mature view. Components:

1. **PersonaSelector** — dropdown to switch between allowed sub-personas
2. **PersonalizedSummaryCard** — 4-bullet summary with relevance stars
3. **ModuleAccordionList** — 6 accordion panels in persona-specific order, each lazy-loading
   content from `generate-module-content` when opened
4. **FiguresSection** — cropped figure images from PDF with captions

Each accordion panel uses `ModuleContentRenderer` to parse the module JSON and render
typed components: `MetricsGrid`, `ClaimCard`, `ProtocolStep`, `NegativeResultCard`, etc.

### Policy Maker View (`PolicyMakerView.tsx`)

A dashboard layout powered by the liquefaction pipeline (see §11). Components:

1. **PersonaSelector** — same component, reused
2. **EvidenceDashboardStrip** — full-width strip showing confidence level, relevance score,
   and top finding
3. **PolicyTagsRow** — horizontal chip row of policy area tags with popover details
4. **PolicyBriefCard** — card with evidence quality badge, relevance score, and a "Full Brief"
   dialog containing the executive policy brief
5. **InfographicPanel** — lazy infographic generator (DALL-E 3, on-demand)
6. **PolicyContentMatcher** — interactive tool: paste a policy draft, get AI fit analysis

### AI Agent Console (`AiAgentConsole.tsx`)

A pure frontend component — no AI calls. Renders:

1. Static curl snippets for 3 API endpoints (paper metadata, module content, summary)
2. API key reference
3. Persona selector to switch away

This view exists for machine consumers who access paper data programmatically via `paper-api`.

### Future Views

`Funding Agency` and `Industry R&D` currently fall through to the `ResearcherView` default.
The `PARENT_PERSONA_REGISTRY` has stub entries for both with empty liquefaction prompts.
To add a new view:

1. Add `liquefactionPrompt` to `parent-personas.ts`
2. Create `FundingAgencyView.tsx`
3. Add `case 'Funding Agency':` to the switch

---

## 11. Policy Maker Liquefaction

"Liquefaction" is the process of synthesizing already-generated module content into
a parent-persona-specific intelligence brief — without re-running RAG.

### Why Not Just Re-Run RAG?

The naive approach would be to create a `generate-policy-view` function that fetches
RAG chunks and calls GPT-4o. But:

- M1, M2, and M5 content is already cached per sub-persona
- Re-running RAG would duplicate embedding calls
- The policy view needs **cross-module synthesis**, not raw chunk analysis
- Liquefaction produces **different data** than any single module (tags, contexts, brief)

### How `generate-policy-view` Works

```
1. Receive { paper_id, sub_persona_id }
         │
2. Derive parentPersona from SUB_PERSONA_REGISTRY
         │
3. Check cache: content_type='policy_view', persona_id=subPersonaId
         │ miss
4. Fetch cached M1, M2, M5 from generated_content_cache
   ├── If any missing → trigger generate-module-content inline
   └── Wait for all with Promise.all
         │
5. Fetch paper.title and paper.abstract
         │
6. Call PARENT_PERSONA_REGISTRY['Policy Maker'].liquefactionPrompt(paper, {M1, M2, M5})
   This extracts:
   - core contribution from M1
   - field impact from M1
   - metrics from M1
   - claims (top 6) from M2
   - policy + research actions from M5
   And composes a structured prompt asking for PolicyViewPayload
         │
7. Call GPT-4o with temperature=0.2, response_format=json_object
         │
8. Cache as content_type='policy_view'
         │
9. Return PolicyViewPayload
```

### PolicyViewPayload Schema

```json
{
  "executive_strip": {
    "relevance_score": 8,
    "relevance_reasoning": "Direct quantitative evidence for EU environmental targets",
    "confidence_level": "high",
    "top_finding": "One precise sentence for a policymaker"
  },
  "policy_tags": {
    "policy_areas": ["climate", "energy policy", "regulation"],
    "policy_relevance_score": 8,
    "policy_relevance_reasoning": "...",
    "suggested_policy_contexts": [
      { "context": "EU Green Deal", "relevance": "Direct evidence for carbon targets" }
    ]
  },
  "policy_brief": {
    "evidence_quality": "Strong",
    "key_claims_summary": ["Claim A in policy terms"],
    "recommended_actions": ["Action 1 for policy makers"],
    "full_brief_text": "Multi-paragraph executive policy brief..."
  },
  "infographic_spec": {
    "title": "...",
    "sections": ["Finding 1", "Finding 2"],
    "key_visual_description": "Description for image generation"
  }
}
```

### Supporting Edge Functions

**`generate-policy-infographic`** — On-demand, not cached:
- Takes `infographic_spec` + `paper_title`
- Calls DALL-E 3 to generate an infographic image
- Stores the image in `paper-figures` storage bucket
- Returns a signed URL

**`match-policy-content`** — On-demand, not cached:
- Takes `paper_id`, `sub_persona_id`, `policy_draft_text`
- Fetches cached M1+M2+M5 content
- Calls GPT-4o to assess fit between draft and paper findings
- Returns `{ fit_score, alignment_areas, gaps, suggested_citation }`

---

## 12. Digital Lab

The Digital Lab is a CRUD inventory management system where researchers can catalog
their available equipment, reagents, software, and consumables.

### Data Model

The `digital_lab_inventory` table stores items:

| Column         | Type    | Description                              |
| -------------- | ------- | ---------------------------------------- |
| `id`           | serial  | Auto-increment primary key               |
| `user_id`      | uuid    | Owner (FK to profiles)                   |
| `item_name`    | text    | e.g., "Eppendorf 5424 Centrifuge"        |
| `item_type`    | text    | `instrument`, `reagent`, `software`, `consumable`, `condition` |
| `manufacturer` | text    | e.g., "Eppendorf"                        |
| `model_number` | text    | e.g., "5424 R"                           |
| `description`  | text    | Free-text description                    |
| `specifications`| jsonb  | Arbitrary key-value specs                |
| `quantity`     | integer | Stock count                              |

### Frontend (`DigitalLabPage.tsx`)

- Filterable/sortable inventory table
- Add/edit items via dialog (`LabItemDialog`)
- Type-based filtering (instruments, reagents, etc.)
- Direct integration: "Replicate" button navigates to Replication Assistant with paper ID

### Lab Simulation (`simulate-lab`)

When a user has no lab inventory, the system can auto-generate a realistic one
using the `simulate-lab` edge function:

1. Reads `structured_papers.methods` to identify required tools/reagents/software
2. Calls GPT-4o-mini to generate 12–18 realistic lab items:
   - ~60% matching paper requirements
   - ~40% typical for the field but NOT in the paper (to create interesting gaps)
3. Inserts items into `digital_lab_inventory`

This creates a meaningful starting point for the Replication Assistant's gap analysis.

---

## 13. Replication Assistant

The Replication Assistant helps researchers plan how to replicate a paper's experiments
using their actual lab inventory.

### Access

Route: `/replication/:paperId`

### Three-Phase Workflow

#### Phase 1: Gap Analysis (`RequirementsComparison`)

Compares paper methods against lab inventory:

- Extracts all tools, reagents, and software from `structured_papers.methods`
- Cross-references against `digital_lab_inventory` items
- Categorizes each requirement as: `available`, `partial_match`, or `missing`
- Displays a side-by-side comparison table

#### Phase 2: Experiment Planner (`ExperimentPlanner`)

An interactive drag-and-drop interface where researchers:

- Select which method steps to include in their replication plan
- Reorder steps
- Add notes and modifications
- Flag critical dependencies

Each method step is rendered as a `MethodCard` showing tools, reagents, conditions,
and critical notes from the structured paper data.

#### Phase 3: Agentic Planning (`AgenticPlanningPanel`)

When the user has identified gaps, the `agentic-planning` edge function provides
AI-powered resource planning:

- Input: methods, gap analysis results, lab inventory, research field
- Output:
  - **Resource groups**: suggested facilities/vendors/collaborators to fill gaps
  - **Approximations**: possible substitutes from existing inventory with fidelity scores
  - **Step-by-step guide**: a complete replication plan using available equipment
  - **Instrument setup**: specific setup instructions for available instruments

Uses the Lovable AI Gateway (Gemini model) rather than OpenAI.

### Critical Notes Display

`CriticalNotes` extracts and prominently displays any critical warnings from the paper's
method steps — things like temperature sensitivity, timing requirements, safety warnings.
These are the notes that would cause replication failure if missed.

---

## 14. Analytical Pipeline

The Analytical Pipeline (`/analysis/:paperId`) allows users to decompose a paper's
analytical decisions into an interactive sensitivity analysis.

### How It Works

1. User selects items from the paper view (claims, methods, figures) and adds them to
   the "Pipeline Cart" (`AnalyticalPipelineCart`)

2. On the pipeline page, the `decompose-pipeline` edge function:
   - Receives the selected items
   - Uses AI (Gemini via Lovable AI Gateway) to identify the analytical pipeline:
     - **Pipeline steps**: ordered stages (data → cleaning → transform → model → output)
     - **Decision points**: for each step, the author's choice and 2–3 alternatives
     - **Variables**: extracted variables with roles and definitions
     - **Sensitivity notes**: what changes if each alternative were chosen
     - **Mock data**: simulated effect sizes and scatter plots

3. The frontend renders:
   - **PipelineFlowView**: visual flow diagram of pipeline stages
   - **DecisionPointCard**: each decision with author choice and alternative options
   - **VariableMappingTable**: extracted variables and their roles
   - **SensitivityPanel**: interactive what-if analysis with mock visualizations

### Current State

The analytical pipeline uses tool-calling (structured output) to ensure the AI response
matches the exact schema needed for the interactive components. Mock data (effect sizes,
scatter plots) is AI-generated rather than extracted from the paper.

---

## 15. Caching Strategy

All AI-generated content is cached in the `generated_content_cache` table.

### Cache Key Structure

| Column         | Role                                              |
| -------------- | ------------------------------------------------- |
| `paper_id`     | Which paper                                       |
| `content_type` | `'summary'`, `'module'`, or `'policy_view'`       |
| `persona_id`   | The **sub-persona** ID (e.g., `'think_tank'`)     |
| `module_id`    | The module ID (e.g., `'M2'`), null for summaries  |

**Composite key:** `(paper_id, content_type, persona_id, module_id)`

### What Gets Cached

| Content Type   | Cache Key Pattern                                    | AI Model Used |
| -------------- | ---------------------------------------------------- | ------------- |
| Module content | `(paper_id, 'module', 'phd_postdoc', 'M2')`        | GPT-4o        |
| Summary        | `(paper_id, 'summary', 'think_tank', null)`          | GPT-4o-mini   |
| Policy view    | `(paper_id, 'policy_view', 'gov_institution', null)` | GPT-4o        |

### What Is NOT Cached

| Feature             | Why not cached                                      |
| ------------------- | --------------------------------------------------- |
| Policy infographic  | On-demand image generation, per user session         |
| Policy content match| User-specific draft text, unique each time           |
| Agentic planning    | Depends on current lab inventory, changes frequently |
| Simulated impact    | Stored on `papers` table directly, not in cache      |

### Cache Invalidation

Currently, **there is no cache invalidation**. Once generated, content persists indefinitely.
There is no mechanism to regenerate content if the paper is re-processed or if the AI
models are updated. This is a known limitation.

---

## 16. Known Limitations and Issues

### Figure Interactivity

**Problem:** Figures are static raster crops from the PDF. A bar chart is rendered as a
flat image — users cannot hover over bars, zoom into data points, or re-plot the data.

**Root cause:** The pipeline extracts figure metadata (captions, descriptions) via text
analysis, and locates figures via bounding box detection, but does not extract the
underlying data from the figure image.

**What would fix it:** A dedicated data extraction step using GPT-4o Vision to analyze
each cropped figure image and extract axis labels, data points, and series into structured
JSON. This data could then be rendered as interactive Recharts components. This has not
been implemented.

### Single-Pass Token Limit

**Problem:** `run-structuring` uses `max_tokens: 16000` in a single GPT-4o call.
For very long papers (40+ pages), the input may approach GPT-4o's context window limit,
and the output may be truncated — potentially losing later sections, methods, or references.

**Impact:** Papers over ~30 pages may have incomplete claims, missing method steps,
or truncated reference lists. The system does not detect or report truncation.

**What would fix it:** Multi-pass structuring (split paper into sections, structure each
separately, merge), or using models with larger output windows.

### Per-Sub-Persona Cache Redundancy

**Problem:** RAG retrieval is identical for sub-personas within the same parent persona
(e.g., `think_tank` and `gov_institution` retrieve the same chunks for M1). Only the
prompt wrapping differs. Yet the system embeds the query and runs `match_chunks`
separately for each sub-persona.

**Impact:** If a paper has 8 sub-personas × 6 modules = 48 module generations, it runs
48 separate embedding + retrieval cycles instead of ~30 (sharing within parent groups).

**What would fix it:** Cache RAG retrieval at the `(paper_id, module_id)` level
(persona-independent), then only vary the prompt composition per sub-persona.

### No Streaming

**Problem:** Module generation takes 10–30 seconds. During this time, the user sees
a skeleton loader with no feedback on progress.

**Impact:** Perceived latency is high, especially when opening multiple modules.

**What would fix it:** Use OpenAI's streaming API with Server-Sent Events (SSE)
from the edge function. The frontend would progressively render content as it arrives.

### Structuring Quality on Long/Complex Papers

**Problem:** The structuring prompt asks GPT-4o to extract 12 element types in a single
call. For interdisciplinary papers, review articles, or papers with unusual structures,
the model may:
- Miss claims buried in discussion sections
- Merge multiple method steps into one
- Under-extract negative results
- Generate low-quality scicomm hooks

**Impact:** Downstream module quality depends entirely on structuring quality.
Poor structuring cascades through the entire system.

### No Re-Processing Mechanism

**Problem:** Once a paper is processed, there is no UI or backend mechanism to
re-trigger the pipeline. If structuring produced poor results, the user cannot
request a do-over.

### Bounding Box Quality

**Problem:** GPT-4o's figure bounding box detection is approximate. For papers with
complex layouts (multi-column, full-width figures, subfigure panels), the bounding
boxes may be significantly off.

### OpenAI API Dependency

**Problem:** The core pipeline depends entirely on OpenAI's API (GPT-4o, GPT-4o-mini,
text-embedding-3-small, DALL-E 3). There is no fallback provider.

---

## 17. Database Tables

### `papers`

The central record for each uploaded/imported paper.

| Column                   | Type     | Description                               |
| ------------------------ | -------- | ----------------------------------------- |
| `id`                     | serial   | Primary key                               |
| `user_id`                | uuid     | Owner (FK to profiles)                    |
| `title`                  | text     | Extracted or user-provided title          |
| `authors`                | jsonb    | Array of `{name, affiliation, orcid}`     |
| `abstract`               | text     | Paper abstract                            |
| `doi`                    | text     | DOI identifier                            |
| `journal`                | text     | Journal name                              |
| `publication_date`       | text     | Publication date string                   |
| `source_type`            | text     | `'pdf_upload'` or `'doi'`                 |
| `storage_path`           | text     | Path in `research-papers` bucket          |
| `file_size`              | integer  | PDF file size in bytes                    |
| `num_pages`              | integer  | Page count (set by parser)                |
| `status`                 | text     | Pipeline status (see §2)                  |
| `error_message`          | text     | Error details if status='failed'          |
| `selected_personas`      | jsonb    | Array of SubPersonaId selected for this paper |
| `simulated_impact_scores`| jsonb    | 6-dimension impact scores (see §2)        |
| `author_impact_scores`   | jsonb    | User self-assessed author impact          |

### `structured_papers`

One row per paper, containing the full structured extraction.

| Column               | Type    | Description                              |
| -------------------- | ------- | ---------------------------------------- |
| `paper_id`           | integer | PK + FK to papers                        |
| `metadata`           | jsonb   | Title, authors, DOI, journal, field      |
| `abstract`           | text    | Full abstract                            |
| `sections`           | jsonb   | Array of section objects                 |
| `claims`             | jsonb   | Array of claim objects                   |
| `methods`            | jsonb   | Array of method step objects             |
| `figures`            | jsonb   | Array of figure objects (with bounding_box) |
| `tables_data`        | jsonb   | Array of table objects                   |
| `equations`          | jsonb   | Array of equation objects                |
| `negative_results`   | jsonb   | Array of negative result objects         |
| `call_to_actions`    | jsonb   | Array of CTA objects                     |
| `scicomm_hooks`      | jsonb   | Array of scicomm hook objects            |
| `references_list`    | jsonb   | Array of reference objects               |
| `author_enrichments` | jsonb   | User-added author context                |
| `schema_version`     | text    | Currently `'2.0'`                        |

### `chunks`

Vector-embedded content chunks for RAG retrieval.

| Column             | Type       | Description                             |
| ------------------ | ---------- | --------------------------------------- |
| `id`               | serial     | PK                                      |
| `paper_id`         | integer    | FK to papers                            |
| `chunk_id`         | text       | Unique ID (e.g., `'claim_3'`)          |
| `chunk_type`       | text       | Type (see §4)                           |
| `content`          | text       | Chunk text                              |
| `embedding`        | vector     | 1536-dim embedding                      |
| `module_relevance` | jsonb      | `{M1: 0.7, M2: 0.95, ...}`            |
| `page_numbers`     | int[]      | Source page numbers                     |
| `source_ids`       | text[]     | IDs of source structured elements       |

### `generated_content_cache`

Cached AI-generated content.

| Column          | Type    | Description                               |
| --------------- | ------- | ----------------------------------------- |
| `id`            | serial  | PK                                        |
| `paper_id`      | integer | FK to papers                              |
| `content_type`  | text    | `'summary'`, `'module'`, `'policy_view'`  |
| `persona_id`    | text    | Sub-persona ID (e.g., `'think_tank'`)     |
| `module_id`     | text    | Module ID (null for summaries/policy_view) |
| `content`       | jsonb   | The cached AI output                      |
| `source_chunks` | text[]  | Chunk IDs used for generation             |

### `digital_lab_inventory`

User's lab equipment inventory.

| Column           | Type    | Description                             |
| ---------------- | ------- | --------------------------------------- |
| `id`             | serial  | PK                                      |
| `user_id`        | uuid    | FK to profiles                          |
| `item_name`      | text    | Equipment/reagent name                  |
| `item_type`      | text    | instrument/reagent/software/consumable  |
| `manufacturer`   | text    | Brand name                              |
| `model_number`   | text    | Model identifier                        |
| `description`    | text    | Free-text description                   |
| `specifications` | jsonb   | Arbitrary specs                         |
| `quantity`        | integer | Stock count                             |

### `profiles`

Extended user profile information.

| Column              | Type     | Description                     |
| ------------------- | -------- | ------------------------------- |
| `id`                | uuid     | PK (matches auth.users.id)     |
| `full_name`         | text     | Display name                   |
| `avatar_url`        | text     | Profile picture URL            |
| `institution`       | text     | University/organization        |
| `bio`               | text     | Short bio                      |
| `orcid`             | text     | ORCID identifier               |
| `website`           | text     | Personal website               |
| `location`          | text     | Geographic location            |
| `experience_keywords` | text[] | Research interest keywords     |

### `user_activity_events`

Fire-and-forget analytics events.

| Column       | Type    | Description                              |
| ------------ | ------- | ---------------------------------------- |
| `id`         | serial  | PK                                       |
| `user_id`    | uuid    | Who                                      |
| `paper_id`   | integer | Which paper (nullable)                   |
| `event_type` | text    | e.g., `'persona_changed'`, `'protocol_opened'` |

### `paper_api_keys`

API keys for programmatic paper access.

| Column          | Type      | Description                           |
| --------------- | --------- | ------------------------------------- |
| `id`            | uuid      | PK                                    |
| `user_id`       | uuid      | Owner                                 |
| `api_key_hash`  | text      | SHA-256 hash of the key               |
| `api_key_prefix`| text      | First N chars for identification      |
| `label`         | text      | User-given label                      |
| `last_used_at`  | timestamp | Last API call timestamp               |

### `user_roles`

Role-based access control.

| Column    | Type    | Description            |
| --------- | ------- | ---------------------- |
| `id`      | uuid    | PK                     |
| `user_id` | uuid    | User                   |
| `role`    | enum    | `'admin'` or `'user'`  |

---

## 18. Edge Functions Map

| Function                     | Purpose                                                              | AI Model Used              |
| ---------------------------- | -------------------------------------------------------------------- | -------------------------- |
| `upload-handler`             | Receive PDF upload, store in bucket, create paper record, trigger pipeline | None                       |
| `doi-resolver`               | Resolve DOI via Unpaywall, download OA PDF, trigger pipeline          | None                       |
| `orchestrate-pipeline`       | Fire-and-poll coordinator for the 5-stage pipeline                    | None                       |
| `run-parser`                 | Extract text from PDF using pdfjs-serverless, produce page_map        | None                       |
| `run-structuring`            | GPT-4o single-pass extraction of 12 element types into structured JSON | GPT-4o                     |
| `run-chunking-and-embedding` | Create typed chunks from structured data, embed with OpenAI           | text-embedding-3-small     |
| `run-figure-extraction`      | Locate figures in PDF via GPT-4o Vision, return bounding boxes        | GPT-4o (Responses API)     |
| `generate-simulated-impact`  | Generate 6-dimension projected impact scores                          | GPT-4o-mini                |
| `generate-summary`           | Persona-tailored 4-bullet summary with RAG                            | GPT-4o-mini                |
| `generate-module-content`    | Generate one module (M1–M6) for one sub-persona with RAG              | GPT-4o                     |
| `explain-metric`             | RAG-powered passage retrieval for a user query about a paper          | text-embedding-3-small     |
| `generate-policy-view`       | Liquefaction: synthesize M1+M2+M5 cache into PolicyViewPayload       | GPT-4o                     |
| `generate-policy-infographic`| Generate DALL-E 3 infographic from infographic spec                   | DALL-E 3                   |
| `match-policy-content`       | Assess fit between user's policy draft and paper findings             | GPT-4o                     |
| `simulate-lab`               | Auto-generate realistic lab inventory based on paper field            | GPT-4o-mini                |
| `agentic-planning`           | AI resource planning for replication gaps                              | Gemini (Lovable AI Gateway)|
| `decompose-pipeline`         | Decompose analytical decisions into interactive pipeline              | Gemini (Lovable AI Gateway)|
| `paper-api`                  | REST API for programmatic paper access (API key auth)                 | None                       |
| `admin-dashboard`            | Admin analytics and management                                        | None                       |
| `generate-protocol-infographic`| Generate protocol visualization                                    | (varies)                   |

---

## 19. Routes Map

| Route                        | Page Component             | Auth Required | Description                              |
| ---------------------------- | -------------------------- | ------------- | ---------------------------------------- |
| `/`                          | `LandingPage`              | No            | Public landing page                      |
| `/auth`                      | `AuthPage`                 | No            | Login/signup                             |
| `/hub`                       | `HubPage`                  | Yes           | Main hub/dashboard                       |
| `/researcher-home`           | `ResearcherHomePage`       | Yes           | Paper library, upload, DOI import        |
| `/paper/:paperId`            | `PaperViewPage`            | Yes           | Main paper view with persona dispatch    |
| `/paper/:paperId/public`     | `PublicPaperViewPage`      | No            | Public read-only paper view              |
| `/replication/:paperId`      | `ReplicationAssistantPage` | Yes           | Replication gap analysis + planner       |
| `/analysis/:paperId`         | `AnalyticalPipelinePage`   | Yes           | Decision point decomposition             |
| `/digital-lab`               | `DigitalLabPage`           | Yes           | Lab inventory management                 |
| `/api-keys`                  | `ApiKeysPage`              | Yes           | Manage API keys for paper-api            |
| `/admin`                     | `AdminPage`                | Yes           | Admin dashboard (role-gated)             |
| `/profile/:userId`           | `PublicProfilePage`        | No            | Public researcher profile                |

---

## Glossary

| Term              | Definition                                                                  |
| ----------------- | --------------------------------------------------------------------------- |
| **Chunk**         | A text segment from a structured paper, embedded as a 1536-dim vector       |
| **Liquefaction**  | Cross-module synthesis that transforms cached module content into persona-specific intelligence (e.g., policy brief) |
| **Module**        | One of 6 knowledge lenses (M1–M6) that each cover the paper from a different angle |
| **Parent Persona**| Top-level persona category that determines visualization paradigm           |
| **Sub-Persona**   | Specific reader role within a parent persona that drives AI content behavior |
| **RAG**           | Retrieval-Augmented Generation: embed a query, retrieve relevant chunks, compose prompt |
| **Structuring**   | The single-pass GPT-4o extraction that converts raw PDF text into 12 typed JSON arrays |
| **Fire-and-poll** | The orchestrator pattern: dispatch an edge function, then poll DB for completion signals |

---

*This document was generated from the Paper++ codebase as of March 2026.*
