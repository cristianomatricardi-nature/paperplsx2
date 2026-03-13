import { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FileUp, Link, FileText, X, Sparkles, Eye } from 'lucide-react';
import { uploadPaper, resolveDOI } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import { useRealtimePaper } from '@/hooks/useRealtimePaper';
import { supabase } from '@/integrations/supabase/client';
import PipelineProgressBar from './PipelineProgressBar';
import * as pdfjsLib from 'pdfjs-dist';

// Use the bundled worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

/** Fire-and-forget: render all PDF pages to PNG and upload to paper-figures bucket */
async function uploadPagePngs(file: File, paperId: number) {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const doc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const numPages = doc.numPages;
    console.log(`[UploadSection] Rendering ${numPages} pages to PNG for paper ${paperId}`);

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      try {
        const page = await doc.getPage(pageNum);
        const viewport = page.getViewport({ scale: 2 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d')!;
        await page.render({ canvasContext: ctx, viewport }).promise;

        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob((b) => resolve(b), 'image/png'),
        );
        if (!blob) continue;

        const path = `${paperId}/page_${pageNum}.png`;
        await supabase.storage.from('paper-figures').upload(path, blob, {
          contentType: 'image/png',
          upsert: true,
        });
        console.log(`[UploadSection] Uploaded page ${pageNum}/${numPages}`);
      } catch (err) {
        console.warn(`[UploadSection] Failed to render/upload page ${pageNum}:`, err);
      }
    }
    doc.destroy();
    console.log(`[UploadSection] All ${numPages} page PNGs uploaded for paper ${paperId}`);
  } catch (err) {
    console.warn('[UploadSection] PNG rendering failed (non-fatal):', err);
  }
}

interface UploadSectionProps {
  userId: string;
  onPaperAdded: () => void;
}

const MAX_SIZE = 20 * 1024 * 1024; // 20 MB

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function UploadSection({ userId, onPaperAdded }: UploadSectionProps) {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Two-step state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [paperId, setPaperId] = useState<number | null>(null);
  const [uploadMode] = useState<'paperpp'>('paperpp');

  // DOI state
  const [doi, setDoi] = useState('');
  const [resolving, setResolving] = useState(false);

  // Library upload state
  

  // Realtime pipeline tracking
  const { status, paper } = useRealtimePaper(paperId);
  const errorMessage = paper?.error_message as string | null;

  const isPipelineRunning = paperId !== null && status !== 'completed' && status !== 'failed';
  const isPipelineDone = status === 'completed';
  const isPipelineFailed = status === 'failed';

  const validateFile = (file: File): boolean => {
    if (file.type !== 'application/pdf') {
      toast({ title: 'Invalid file', description: 'Only PDF files are accepted.', variant: 'destructive' });
      return false;
    }
    if (file.size > MAX_SIZE) {
      toast({ title: 'File too large', description: 'Maximum file size is 20 MB.', variant: 'destructive' });
      return false;
    }
    return true;
  };

  const handleFileSelect = useCallback((file: File) => {
    if (validateFile(file)) {
      setSelectedFile(file);
      setPaperId(null);
    }
  }, []);

  const handleGenerate = async () => {
    if (!selectedFile) return;
    setUploading(true);
    try {
      const result = await uploadPaper(selectedFile, userId);
      const newPaperId = result?.paper_id;
      if (newPaperId) {
        setPaperId(newPaperId);
        supabase.from('user_activity_events').insert({
          user_id: userId,
          paper_id: newPaperId,
          event_type: 'paper_uploaded',
        }).select().then(() => {});
        uploadPagePngs(selectedFile, newPaperId);
        toast({ title: 'Pipeline started', description: 'Your paper is now being processed.' });
        onPaperAdded();
      } else {
        toast({ title: 'Upload succeeded', description: 'Paper is development processed.' });
        onPaperAdded();
      }
    } catch (err: any) {
      toast({ title: 'Upload failed', description: err.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };


  const handleReset = () => {
    setSelectedFile(null);
    setPaperId(null);
  };

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFileSelect(file);
    },
    [handleFileSelect],
  );

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => setIsDragging(false);

  const handleDOISubmit = async () => {
    const trimmed = doi.trim();
    if (!trimmed) return;
    setResolving(true);
    try {
      await resolveDOI(trimmed, userId);
      toast({ title: 'DOI resolved', description: 'Paper is now being processed.' });
      setDoi('');
      onPaperAdded();
    } catch (err: any) {
      toast({ title: 'DOI resolution failed', description: err.message || 'Please check the DOI.', variant: 'destructive' });
    } finally {
      setResolving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Hero copy */}
      <div className="space-y-3 text-center py-4">
        <p className="text-2xl font-semibold text-foreground leading-tight tracking-tight">
          Transform your paper from something you read<br className="hidden sm:block" /> into something you can operate on.
        </p>
        <p className="text-sm italic text-muted-foreground leading-relaxed max-w-2xl mx-auto">
          Paper++ harnesses liquid content and modular knowledge objects to enable fair evaluation, faster dissemination, stronger replication, and better action.
          {' '}This is not how publications will look in the future. It is how they will work.
        </p>
      </div>

    <Card className="border-border shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg font-serif">Add New Paper</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="upload" className="w-full">
           <TabsList className="w-full">
             <TabsTrigger value="upload" className="flex-1 gap-1.5">
               <FileUp className="h-4 w-4" />
               Upload PDF
             </TabsTrigger>
             <TabsTrigger value="doi" className="flex-1 gap-1.5">
               <Link className="h-4 w-4" />
               Paste DOI
             </TabsTrigger>
           </TabsList>

          {/* Upload PDF */}
          <TabsContent value="upload">
            {!selectedFile && (
              <div
                role="button"
                tabIndex={0}
                className={`mt-2 flex flex-col items-center justify-center gap-3 rounded-md border-2 border-dashed px-6 py-10 transition-colors cursor-pointer
                  ${isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/40'}`}
                onDrop={onDrop}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
              >
                <FileUp className="h-10 w-10 text-muted-foreground" />
                <p className="text-sm text-muted-foreground text-center">
                  Drop your PDF here or click to browse
                </p>
                <p className="text-xs text-muted-foreground">PDF only · Max 20 MB</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect(file);
                    e.target.value = '';
                  }}
                />
              </div>
            )}

            {selectedFile && !paperId && (
              <div className="mt-2 space-y-4">
                <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3">
                  <FileText className="h-8 w-8 shrink-0 text-primary" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                    <p className="text-xs text-muted-foreground">{formatSize(selectedFile.size)}</p>
                  </div>
                  <button
                    onClick={handleReset}
                    className="shrink-0 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    aria-label="Remove file"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <Button
                  onClick={handleGenerate}
                  disabled={uploading}
                  className="w-full gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
                  size="lg"
                >
                  <Sparkles className="h-4 w-4" />
                  {uploading ? 'Uploading…' : 'Generate Paper++'}
                </Button>
              </div>
            )}

            {paperId && (
              <div className="mt-2 space-y-4">
                <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3">
                  <FileText className="h-6 w-6 shrink-0 text-primary" />
                  <p className="text-sm font-medium truncate flex-1">{selectedFile?.name ?? 'Paper'}</p>
                </div>

                <PipelineProgressBar status={status} errorMessage={errorMessage} />

                {isPipelineDone && (
                  <Button
                    onClick={async () => {
                      setUploading(true);
                      try {
                        const { data: settings } = await supabase
                          .from('app_settings' as any)
                          .select('default_personas')
                          .limit(1)
                          .single();
                        const personas = (settings as any)?.default_personas ??
                          ['phd_postdoc', 'pi_tenure', 'think_tank', 'science_educator', 'ai_agent', 'funder_private'];
                        await supabase
                          .from('papers')
                          .update({ selected_personas: personas as unknown as any })
                          .eq('id', paperId!);
                        navigate(`/paper/${paperId}`);
                      } catch {
                        toast({ title: 'Error saving personas', variant: 'destructive' });
                      } finally {
                        setUploading(false);
                      }
                    }}
                    disabled={uploading}
                    className="w-full gap-2"
                    size="lg"
                  >
                    <Eye className="h-4 w-4" />
                    {uploading ? 'Saving…' : 'View Paper++'}
                  </Button>
                )}

                {isPipelineFailed && (
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={handleReset} className="flex-1">
                      Try Again
                    </Button>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* Paste DOI */}
          <TabsContent value="doi">
            <div className="mt-2 flex gap-2">
              <Input
                placeholder="e.g., 10.1038/s41586-024-00001-1"
                value={doi}
                onChange={(e) => setDoi(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleDOISubmit()}
                disabled={resolving}
              />
              <Button
                onClick={handleDOISubmit}
                disabled={resolving || !doi.trim()}
                className="shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {resolving ? 'Resolving…' : 'Resolve DOI'}
              </Button>
            </div>
          </TabsContent>

        </Tabs>
      </CardContent>
    </Card>
    </div>
  );
}
