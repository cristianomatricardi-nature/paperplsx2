import { useCallback, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FileUp, Link } from 'lucide-react';
import { uploadPaper, resolveDOI } from '@/lib/api';
import { toast } from '@/hooks/use-toast';

interface UploadSectionProps {
  userId: string;
  onPaperAdded: () => void;
}

const MAX_SIZE = 20 * 1024 * 1024; // 20 MB

export default function UploadSection({ userId, onPaperAdded }: UploadSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [doi, setDoi] = useState('');
  const [resolving, setResolving] = useState(false);

  const handleFile = useCallback(
    async (file: File) => {
      if (file.type !== 'application/pdf') {
        toast({ title: 'Invalid file', description: 'Only PDF files are accepted.', variant: 'destructive' });
        return;
      }
      if (file.size > MAX_SIZE) {
        toast({ title: 'File too large', description: 'Maximum file size is 20 MB.', variant: 'destructive' });
        return;
      }
      setUploading(true);
      try {
        await uploadPaper(file, userId);
        toast({ title: 'Paper uploaded', description: 'Your paper is now being processed.' });
        onPaperAdded();
      } catch (err: any) {
        toast({ title: 'Upload failed', description: err.message || 'Please try again.', variant: 'destructive' });
      } finally {
        setUploading(false);
      }
    },
    [userId, onPaperAdded],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
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
            <div
              role="button"
              tabIndex={0}
              className={`mt-2 flex flex-col items-center justify-center gap-3 rounded-md border-2 border-dashed px-6 py-10 transition-colors cursor-pointer
                ${isDragging ? 'border-[hsl(var(--deep-blue))] bg-[hsl(var(--deep-blue)/0.05)]' : 'border-border hover:border-muted-foreground/40'}`}
              onDrop={onDrop}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
            >
              <FileUp className="h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground text-center">
                {uploading ? 'Uploading…' : 'Drop your PDF here or click to browse'}
              </p>
              <p className="text-xs text-muted-foreground">PDF only · Max 20 MB</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                  e.target.value = '';
                }}
              />
            </div>
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
                className="shrink-0 bg-[hsl(var(--deep-blue))] hover:bg-[hsl(var(--deep-blue)/.85)] text-[hsl(var(--deep-blue-foreground))]"
              >
                {resolving ? 'Resolving…' : 'Resolve DOI'}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
