

# Create a Downloadable Architecture Guide

## What We're Building
A comprehensive, downloadable Markdown document (`ARCHITECTURE.md`) placed at the project root that serves as the definitive guide to Paper++'s architecture -- covering the full pipeline from PDF upload to persona-tailored visualization, the Digital Lab, Replication Assistant, and all known limitations.

## Document Structure

The document will cover:

1. **System Overview** -- High-level diagram of the three main product pillars (Paper++ Generator, Digital Lab, Replication Assistant) and how they connect
2. **Pipeline: From PDF to Knowledge Object** -- The 5-stage orchestration pipeline (Upload, Parse, Structure, Chunk/Embed, Figure Extraction, Simulated Impact)
3. **The Structured Paper Schema** -- What `run-structuring` extracts (sections, claims, methods, figures, negative results, CTAs, scicomm hooks, equations, tables, references)
4. **RAG Layer** -- How chunks are created, module_relevance scores, embedding model, the `match_chunks` RPC, multi-tier fallback (0.5 to 0.2 threshold)
5. **Figure Extraction** -- GPT-4o Vision bounding box detection, raster crop via PDF.js, current limitations (static images only, no data extraction)
6. **Persona System** -- Dual-registry architecture (frontend minimal metadata vs backend 14-field behavioral config), parent vs sub-persona distinction, module ordering
7. **Module Framework (M1-M6)** -- Each module's purpose, JSON schema, how `generate-module-content` works (cache check, RAG retrieval, prompt composition, GPT-4o call, caching)
8. **Prompt Composition** -- The 7-section prompt architecture from `prompt-composers.ts` (Reader Profile, Quantitative Depth Mandate, Module-Specific Adaptation, Educational Extras, Broader Impact, Disclaimers, Paper Context, Module Schema)
9. **Personalized Summaries** -- How `generate-summary` works (GPT-4o-mini, RAG, persona-tailored 4-bullet output)
10. **Visualization Paradigms** -- The `parentPersona` dispatcher pattern, ResearcherView (modular accordion), PolicyMakerView (liquefaction dashboard), AiAgentConsole (API reference)
11. **Policy Maker Liquefaction** -- How `generate-policy-view` consumes cached M1+M2+M5 to produce PolicyViewPayload without redundant RAG
12. **Digital Lab** -- CRUD inventory system, item types, how it connects to Replication Assistant
13. **Replication Assistant** -- Gap analysis, drag-and-drop experiment planner, agentic planning, lab simulation
14. **Analytical Pipeline** -- Decision point decomposition
15. **Caching Strategy** -- `generated_content_cache` table schema and cache key patterns
16. **Known Limitations and Issues** -- Figure interactivity, single-pass token limits, per-sub-persona cache redundancy, no streaming, structuring quality on long papers
17. **Database Tables** -- Key tables and their roles (papers, structured_papers, chunks, generated_content_cache, digital_lab_inventory, user_activity_events, paper_api_keys)
18. **Edge Functions Map** -- Complete list of all backend functions with one-line descriptions
19. **Routes Map** -- All frontend routes

## Technical Details

- **File**: `ARCHITECTURE.md` at project root
- **Format**: Clean Markdown with headers, tables, ASCII diagrams, and code snippets where needed
- **Length**: ~3000-4000 lines of well-structured documentation
- **Downloadable**: The file will be in the project and can be accessed/downloaded directly

## Implementation
Single file creation -- no other files are modified.
