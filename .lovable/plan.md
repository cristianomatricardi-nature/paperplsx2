

# Restructure Researcher Home: Generator + Library Separation

## What Changes

1. **Paper++ Generator** (`UploadSection`) shows only the current/last paper being generated — no list below it. Remove the "My Library" tab from inside it (library upload moves to the library section).

2. **My Library** becomes a new standalone section below the generator with two tabs:
   - **My Papers** — papers uploaded via the library uploader (`source_type = 'library'`). Grey styling, compact cards, used for context.
   - **Paper++ Collection** — all Paper++ generated papers (`source_type != 'library'`). Teal/green styling, clickable to view.

3. The library section includes its own upload dropzone for adding papers to "My Papers."

## File Changes

### `src/components/researcher-home/UploadSection.tsx`
- Remove the "My Library" tab and all library upload logic (the `libraryFileInputRef`, `handleLibraryUpload`, `libraryUploading` state, and the `TabsContent value="library"` block)
- Keep only "Upload PDF" and "Paste DOI" tabs — this is purely a Paper++ generator

### `src/components/researcher-home/PaperLibrary.tsx` (rewrite)
- Add Tabs component with two tabs: "My Papers" and "Paper++ Collection"
- **My Papers tab**: filters papers where `source_type = 'library'`, shows compact grey cards, includes a small upload dropzone at the top for adding library papers
- **Paper++ Collection tab**: filters papers where `source_type != 'library'` (or is null), shows teal-bordered cards with "View Paper++" action
- Move the library upload logic (from UploadSection) into this component

### `src/components/researcher-home/PaperCard.tsx`
- Already has dual styling for library vs Paper++ — no changes needed

### `src/pages/ResearcherHomePage.tsx`
- Layout stays the same: `UploadSection` then `PaperLibrary`
- No structural changes needed since both components are already rendered in order

## Technical Notes

- The library upload logic (FormData + `upload-handler` + `orchestrate-pipeline` with `library_only: true`) moves from `UploadSection` into `PaperLibrary` under the "My Papers" tab
- Paper counts in each tab badge show filtered counts
- The generator only ever shows the single paper currently being processed (already the case — `paperId` state tracks just one)

