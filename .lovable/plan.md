
## Dynamic Waveform Audio Player (NotebookLM-style)

(Previous plan — implemented)

## Gemini-Powered Figure Extraction with Citation Mapping (IMPLEMENTED)

### Changes made

| File | Status |
|------|--------|
| `run-figure-extraction/index.ts` | ✅ Full rewrite: pdfjs-serverless page→PNG, Gemini 2.5 Flash vision + code_execution, crop upload, citation mapping |
| `src/types/structured-paper.ts` | ✅ Added `FigureSubPanel`, `FigureCitation`, and new fields on `Figure` |
| `generate-module-content/index.ts` | ✅ Injects figure citations + visual descriptions into prompt |
| `generate-summary/index.ts` | ✅ Includes figure context for inline placement |
| `ModuleContentRenderer.tsx` | ✅ Supports sub-panel tokens `[FIGURE: fig_Xa]` |
| `FigurePlaceholder.tsx` | ✅ Renders sub-panels as grid, shows visual_description |

### Secret added
- `GOOGLE_API_KEY` — Google AI Studio key for native Gemini API
