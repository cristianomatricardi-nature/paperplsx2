import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, Plus, Trash2, Copy, Key } from 'lucide-react';

interface ApiKey {
  id: string;
  api_key_prefix: string;
  label: string;
  created_at: string;
  last_used_at: string | null;
}

export default function ApiKeysPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newKeyRaw, setNewKeyRaw] = useState<string | null>(null);

  const projectUrl = import.meta.env.VITE_SUPABASE_URL;

  const fetchKeys = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('paper_api_keys' as any)
      .select('id, api_key_prefix, label, created_at, last_used_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setKeys((data as unknown as ApiKey[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchKeys();
  }, [user]);

  const handleCreate = async () => {
    if (!user || !newLabel.trim()) return;
    setCreating(true);
    try {
      // Generate a random API key
      const rawKey = 'pp_' + crypto.randomUUID().replace(/-/g, '');
      const prefix = rawKey.slice(0, 8) + '...';
      // Hash the key using SubtleCrypto
      const encoder = new TextEncoder();
      const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(rawKey));
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

      await supabase.from('paper_api_keys' as any).insert({
        user_id: user.id,
        api_key_hash: hashHex,
        api_key_prefix: prefix,
        label: newLabel.trim(),
      });

      setNewKeyRaw(rawKey);
      setNewLabel('');
      fetchKeys();
    } catch (err: any) {
      toast({ title: 'Error creating key', description: err.message, variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    await supabase.from('paper_api_keys' as any).delete().eq('id', id);
    setKeys((prev) => prev.filter((k) => k.id !== id));
    toast({ title: 'API key deleted' });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied to clipboard' });
  };

  const endpoint = `${projectUrl}/functions/v1/paper-api`;

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-30 flex items-center border-b border-border bg-background/95 backdrop-blur px-4 md:px-8 py-2">
        <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" onClick={() => navigate('/researcher-home')}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <h1 className="ml-4 text-lg font-serif font-semibold">API Keys</h1>
      </div>

      <div className="max-w-2xl mx-auto p-6 space-y-6">
        {/* Create new key */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-sans">Create API Key</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="Key label (e.g. My App)"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              />
              <Button onClick={handleCreate} disabled={creating || !newLabel.trim()} className="gap-1.5 shrink-0">
                <Plus className="h-4 w-4" /> Create
              </Button>
            </div>

            {newKeyRaw && (
              <div className="rounded-md border border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/20 p-3 space-y-2">
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  Save this key — it won't be shown again:
                </p>
                <div className="flex items-center gap-2">
                  <code className="text-xs bg-background rounded px-2 py-1 flex-1 overflow-x-auto">{newKeyRaw}</code>
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => copyToClipboard(newKeyRaw)}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <Button variant="outline" size="sm" onClick={() => setNewKeyRaw(null)}>Dismiss</Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Existing keys */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-sans">Your Keys</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : keys.length === 0 ? (
              <p className="text-sm text-muted-foreground">No API keys yet.</p>
            ) : (
              <div className="space-y-2">
                {keys.map((k) => (
                  <div key={k.id} className="flex items-center gap-3 rounded-md border border-border px-3 py-2">
                    <Key className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{k.label}</p>
                      <p className="text-xs text-muted-foreground">{k.api_key_prefix} · Created {new Date(k.created_at).toLocaleDateString()}</p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive shrink-0" onClick={() => handleDelete(k.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Usage examples */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-sans">Usage</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">Endpoint:</p>
            <div className="flex items-center gap-2">
              <code className="text-xs bg-muted rounded px-2 py-1 flex-1 overflow-x-auto">{endpoint}</code>
              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => copyToClipboard(endpoint)}>
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="text-xs font-mono bg-muted rounded p-3 overflow-x-auto whitespace-pre">{`# Get paper metadata
curl "${endpoint}?paper_id=42" \\
  -H "Authorization: Bearer pp_your_key_here"

# Get a specific module
curl "${endpoint}?paper_id=42&module=M1" \\
  -H "Authorization: Bearer pp_your_key_here"

# Get AI agent summary
curl "${endpoint}?paper_id=42&summary=true" \\
  -H "Authorization: Bearer pp_your_key_here"`}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
