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
import PersonaSelectionStep from './PersonaSelectionStep';
import type { SubPersonaId } from '@/types/modules';

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
  const [isDragging, setIsDragging] = useState(false);

  // Two-step state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [paperId, setPaperId] = useState<number | null>(null);

  // DOI state
  const [doi, setDoi] = useState('');
  const [resolving, setResolving] = useState(false);

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
      setPaperId(null); // reset any previous pipeline
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
        toast({ title: 'Pipeline started', description: 'Your paper is now being processed.' });
        onPaperAdded();
      } else {
        toast({ title: 'Upload succeeded', description: 'Paper is being processed.' });
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
      <div className="space-y-2">
        <p className="text-xl font-serif font-semibold text-foreground leading-snug">
          Transform your paper from something you read into something you can operate on.
        </p>
        <p className="text-sm italic text-muted-foreground leading-relaxed">
          Paper++ harnesses liquid content and modular knowledge objects to enable fair evaluation, faster dissemination, stronger replication, and better action.
          <br />
          This is not how publications will look in the future. It is how they will work.
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
            {/* State 1: No file selected — show drop zone */}
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

            {/* State 2: File selected — show preview + generate button */}
            {selectedFile && !paperId && (
              <div className="mt-2 space-y-4">
                {/* File preview card */}
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

                {/* Generate button */}
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

            {/* State 3: Pipeline running — show progress */}
            {paperId && (
              <div className="mt-2 space-y-4">
                {/* File info */}
                <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3">
                  <FileText className="h-6 w-6 shrink-0 text-primary" />
                  <p className="text-sm font-medium truncate flex-1">{selectedFile?.name ?? 'Paper'}</p>
                </div>

                {/* Progress bars */}
                <PipelineProgressBar status={status} errorMessage={errorMessage} />

                {/* Completed / Failed actions */}
                {isPipelineDone && (
                  <PersonaSelectionStep
                    loading={uploading}
                    onConfirm={async (personas: SubPersonaId[]) => {
                      setUploading(true);
                      try {
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
                  />
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
