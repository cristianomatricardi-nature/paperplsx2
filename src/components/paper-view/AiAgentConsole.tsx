import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, KeyRound, Terminal } from 'lucide-react';
import { toast } from 'sonner';
import PersonaSelector from './PersonaSelector';
import type { SubPersonaId } from '@/types/modules';

interface AiAgentConsoleProps {
  paperId: number;
  subPersonaId: SubPersonaId;
  onPersonaChange: (persona: SubPersonaId) => void;
  allowedPersonas?: SubPersonaId[];
}

const API_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/paper-api`;

const APIS = [
  {
    name: 'SpringerNature Proof API',
    slug: 'proof',
    description:
      'Returns the exact evidence behind a claim so an agent can answer with verifiable support, not guesswork.',
  },
  {
    name: 'SpringerNature Repro API',
    slug: 'repro',
    description:
      'Returns a runnable recipe for a specific result so an agent can reproduce and automatically verify it.',
  },
  {
    name: 'SpringerNature Consensus API',
    slug: 'consensus',
    description:
      'Returns the current standing of a claim across studies so an agent stays aware of conflicts, replications, and updates.',
  },
] as const;

const AiAgentConsole = ({ paperId, subPersonaId, onPersonaChange, allowedPersonas }: AiAgentConsoleProps) => {
  const navigate = useNavigate();

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  return (
    <div className="space-y-6">
      <PersonaSelector value={subPersonaId} onChange={onPersonaChange} allowedPersonas={allowedPersonas} />

      <div>
        <div className="flex items-center gap-2 mb-1">
          <Terminal className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold font-sans text-foreground">Machine-Readable API Access</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Structured endpoints for programmatic consumption of this paper's data.
        </p>
      </div>

      <div className="space-y-4">
        {APIS.map((api) => {
          const curl = `curl -H "Authorization: Bearer YOUR_API_KEY" \\\n  "${API_BASE}?paper_id=${paperId}&api=${api.slug}"`;

          return (
            <Card key={api.slug} className="border-border/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-sans">{api.name}</CardTitle>
                <p className="text-sm text-muted-foreground">{api.description}</p>
              </CardHeader>
              <CardContent className="space-y-3">
                <pre className="rounded-md bg-muted p-3 text-xs font-mono overflow-x-auto whitespace-pre-wrap text-foreground/80">
                  {curl}
                </pre>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={() => copyToClipboard(curl)}>
                    <Copy className="h-3.5 w-3.5" />
                    Copy
                  </Button>
                  <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => navigate('/api-keys')}>
                    <KeyRound className="h-3.5 w-3.5" />
                    Manage API Keys
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default AiAgentConsole;
