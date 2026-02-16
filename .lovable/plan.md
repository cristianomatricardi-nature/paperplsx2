

## Two-Step Upload with Real-Time Pipeline Progress

### What changes

**1. UploadSection gets a two-step flow with progress tracking**

When you select a PDF, instead of immediately uploading it, you'll see:
- A **file preview card** showing the PDF name, size, and an "X" to remove it
- A red **"Generate Paper++"** button to trigger the pipeline
- Once triggered, a **real-time progress tracker** replaces the button, showing each pipeline step with a filling progress bar and red-themed icons

**2. Pipeline steps displayed with progress bars**

The steps shown will match the actual backend pipeline:
1. Uploading (local upload to storage)
2. Parsing (text extraction from PDF)
3. Structuring (AI structural analysis)
4. Embedding (semantic chunking)
5. Figures (figure extraction)
6. Completed

Each step will have:
- A red-themed icon (FileText, Brain, Database, Image, CheckCircle)
- A label
- A filling progress bar that turns red when active/completed
- A checkmark when done, spinner when in progress

### Files to create/edit

**`src/components/researcher-home/UploadSection.tsx`** -- Major rework:
- Add `selectedFile` state to stage the PDF before upload
- Add `paperId` state to track the created paper after upload
- When file is selected: show preview card + "Generate Paper++" button (red styling)
- When button is clicked: call `uploadPaper`, get `paper_id`, switch to progress view
- Use `useRealtimePaper` hook to subscribe to status changes for the created paper
- Render a `PipelineProgressBar` component showing each step with filling bars
- When pipeline completes or fails, show appropriate feedback and reset

**`src/components/researcher-home/PipelineProgressBar.tsx`** -- New component:
- Accepts `status` (current pipeline status) and `errorMessage`
- Renders a vertical list of pipeline steps, each with:
  - A red-themed Lucide icon (e.g., `FileText` for parsing, `Brain` for structuring, `Layers` for embedding, `ImageIcon` for figures, `CheckCircle2` for completed)
  - Step label text
  - A horizontal progress bar (using the existing `Progress` component or a custom one)
  - States: pending (gray), active (red with animation), completed (red filled with check), failed (red-destructive)
- Progress bar fills to 100% for completed steps, animates/pulses for the active step, stays empty for pending steps
- Status text at the bottom showing current action

### Visual Design

- **"Generate Paper++" button**: Red background (`bg-primary`), white text, with a `Sparkles` or `Zap` icon
- **Progress bars**: Red fill color matching the primary/brand color
- **Step icons**: Red-tinted Lucide icons
- **File preview card**: Clean card with PDF icon, filename, size, and a subtle border
- **Completed state**: Green checkmark or a "View Paper++" link button

### Technical Details

- The `uploadPaper` function already returns `{ paper_id }` from the backend
- The `useRealtimePaper` hook already subscribes to real-time status updates for a given paper ID
- Pipeline statuses flow: `uploaded` -> `parsing` -> `structuring` -> `chunking` -> `completed` (or `failed`)
- The progress tracker will use these real-time status updates to animate the bars
- After completion, a "View Paper++" button will link to `/paper/{paperId}`
- A "Reset" or "Upload Another" option will clear the state back to the drop zone
