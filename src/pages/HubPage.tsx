import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  FlaskConical,
  BookOpen,
  User,
  LogOut,
  ShieldCheck,
  ChevronRight,
  ArrowRight,
  MapPin,
  Tag,
  X,
} from 'lucide-react';

const PERSONA_OPTIONS = [
  'PhD / Post-doc',
  'Principal Investigator',
  'Research Scientist',
  'Clinician',
  'Science Communicator',
  'Policy Analyst',
  'Industry Researcher',
];

const HubPage = () => {
  const { user, profile, loading, signOut } = useAuth();
  const { isAdmin } = useUserRole();
  const navigate = useNavigate();

  // Account dialog state
  const [accountOpen, setAccountOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editInstitution, setEditInstitution] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editPersona, setEditPersona] = useState('');
  const [editKeywords, setEditKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState('');
  const [saving, setSaving] = useState(false);

  const openAccountDialog = useCallback(() => {
    setEditName(profile?.full_name || '');
    setEditInstitution(profile?.institution || '');
    setEditLocation((profile as any)?.location || '');
    setEditPersona((profile as any)?.persona || '');
    setEditKeywords((profile as any)?.experience_keywords || []);
    setAccountOpen(true);
  }, [profile]);

  const handleAddKeyword = () => {
    const kw = keywordInput.trim();
    if (kw && !editKeywords.includes(kw)) {
      setEditKeywords((prev) => [...prev, kw]);
    }
    setKeywordInput('');
  };

  const handleRemoveKeyword = (kw: string) => {
    setEditKeywords((prev) => prev.filter((k) => k !== kw));
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: editName.trim() || null,
          institution: editInstitution.trim() || null,
          location: editLocation.trim() || null,
          experience_keywords: editKeywords,
        } as any)
        .eq('id', user.id);
      if (error) throw error;
      toast({ title: 'Profile updated' });
      setAccountOpen(false);
    } catch (err: any) {
      toast({ title: 'Save failed', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (!user) return null;

  const displayName = profile?.full_name || 'Researcher';
  const initials = displayName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="min-h-screen bg-background">
      {/* ── Top Nav ── */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col leading-tight">
            <span className="logo-brand text-lg" style={{ color: 'hsl(var(--hero-teal))' }}>
              Springer Nature – Paper<span style={{ color: 'hsl(var(--hero-teal-mid))' }}>++</span>
            </span>
            <span className="text-[10px] font-normal tracking-wide" style={{ color: 'hsl(var(--hero-teal) / 0.65)' }}>
              Powered by Content Innovation department
            </span>
          </div>

          <div className="flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
                  {/* Avatar chip */}
                  <span
                    className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold"
                    style={{ background: 'hsl(var(--hero-teal))', color: 'hsl(var(--hero-teal-foreground))' }}
                  >
                    {initials}
                  </span>
                  <span className="hidden text-sm sm:inline">{displayName}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem onClick={openAccountDialog}>
                  <User className="mr-2 h-4 w-4" />
                  Manage Account
                </DropdownMenuItem>
                {isAdmin && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate('/admin')}>
                      <ShieldCheck className="mr-2 h-4 w-4" />
                      Admin Dashboard
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleSignOut}
                  className="text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* ── Hero Banner ── */}
      <div className="w-full" style={{ background: 'linear-gradient(100deg, hsl(var(--hero-teal)) 0%, hsl(var(--hero-teal-mid)) 60%, hsl(197 55% 36%) 100%)' }}>
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <div
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full"
              style={{ border: '2px solid hsl(var(--hero-teal-foreground) / 0.6)' }}
            >
              <span
                className="font-serif text-lg font-semibold"
                style={{ color: 'hsl(var(--hero-teal-foreground))' }}
              >
                {initials}
              </span>
            </div>
            <div>
              <h1
                className="font-serif text-2xl font-bold"
                style={{ color: 'hsl(var(--hero-teal-foreground))' }}
              >
                {displayName}
              </h1>
              <p
                className="mt-0.5 text-sm"
                style={{ color: 'hsl(var(--hero-teal-foreground) / 0.72)' }}
              >
                {user.email}
                {(profile as any)?.institution && (
                  <> · {(profile as any).institution}</>
                )}
                {(profile as any)?.location && (
                  <> · {(profile as any).location}</>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Hub Cards ── */}
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="space-y-4">

          {/* ── Paper++ Generator (full-width) ── */}
          <button
            onClick={() => navigate('/researcher-home')}
            className="group w-full rounded-2xl border border-border bg-card text-left shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div className="flex items-center justify-between p-6 sm:p-8">
              <div className="flex items-center gap-5">
                <div
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl"
                  style={{ background: 'hsl(var(--hero-teal) / 0.1)' }}
                >
                  <BookOpen
                    className="h-7 w-7"
                    style={{ color: 'hsl(var(--hero-teal))' }}
                  />
                </div>
                <div>
                  <h2 className="font-serif text-xl font-bold text-foreground">
                    Paper<span className="text-primary">++</span> Generator
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground leading-relaxed max-w-lg">
                    Upload or import a paper and transform it into a modular, interactive knowledge object — with personas, replication tools, and analytical pipelines.
                  </p>
                </div>
              </div>
              <ArrowRight
                className="ml-4 h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1"
              />
            </div>
          </button>

          {/* ── Bottom row: Manage Account + Digital Lab ── */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

            {/* Manage Account */}
            <button
              onClick={openAccountDialog}
              className="group w-full rounded-2xl border border-border bg-card text-left shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div className="flex flex-col gap-4 p-6">
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-xl"
                  style={{ background: 'hsl(var(--primary) / 0.08)' }}
                >
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h2 className="font-serif text-lg font-bold text-foreground">
                    Manage Account
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                    Update your name, institution, location, persona, and experience keywords for collaboration matching.
                  </p>
                </div>
                <div className="flex items-center gap-1 text-xs font-medium text-primary">
                  Edit profile <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </div>
              </div>
            </button>

            {/* Digital Lab */}
            <button
              onClick={() => navigate('/digital-lab')}
              className="group w-full rounded-2xl border border-border bg-card text-left shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div className="flex flex-col gap-4 p-6">
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-xl"
                  style={{ background: 'hsl(var(--hero-teal) / 0.1)' }}
                >
                  <FlaskConical
                    className="h-6 w-6"
                    style={{ color: 'hsl(var(--hero-teal))' }}
                  />
                </div>
                <div>
                  <h2 className="font-serif text-lg font-bold text-foreground">
                    Digital Lab
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                    Manage your inventory of instruments, reagents, software, and conditions for replication readiness checks.
                  </p>
                </div>
                <div className="flex items-center gap-1 text-xs font-medium" style={{ color: 'hsl(var(--hero-teal))' }}>
                  Open lab <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </div>
              </div>
            </button>
          </div>
        </div>
      </main>

      {/* ── Manage Account Dialog ── */}
      <Dialog open={accountOpen} onOpenChange={setAccountOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">Manage Account</DialogTitle>
            <DialogDescription>
              Update your profile and collaboration preferences.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-5 pt-2">
            {/* Full Name */}
            <div className="space-y-1.5">
              <Label htmlFor="hub-name">Full Name</Label>
              <Input
                id="hub-name"
                placeholder="Dr. Jane Smith"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>

            {/* Institution */}
            <div className="space-y-1.5">
              <Label htmlFor="hub-institution">Institution</Label>
              <Input
                id="hub-institution"
                placeholder="MIT, Stanford, …"
                value={editInstitution}
                onChange={(e) => setEditInstitution(e.target.value)}
              />
            </div>

            {/* Location */}
            <div className="space-y-1.5">
              <Label htmlFor="hub-location" className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                Location
                <span className="ml-1 text-xs font-normal text-muted-foreground">
                  (for collaboration matching)
                </span>
              </Label>
              <Input
                id="hub-location"
                placeholder="Boston, MA · USA"
                value={editLocation}
                onChange={(e) => setEditLocation(e.target.value)}
              />
            </div>

            {/* Persona */}
            <div className="space-y-1.5">
              <Label>Persona</Label>
              <div className="flex flex-wrap gap-2">
                {PERSONA_OPTIONS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setEditPersona(p === editPersona ? '' : p)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      editPersona === p
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Experience Keywords */}
            <div className="space-y-1.5">
              <Label htmlFor="hub-keywords" className="flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                Experience Keywords
              </Label>
              <div className="flex gap-2">
                <Input
                  id="hub-keywords"
                  placeholder="e.g. CRISPR, fMRI, NLP…"
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddKeyword();
                    }
                  }}
                />
                <Button type="button" variant="outline" size="sm" onClick={handleAddKeyword}>
                  Add
                </Button>
              </div>
              {editKeywords.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {editKeywords.map((kw) => (
                    <Badge key={kw} variant="secondary" className="gap-1 pr-1">
                      {kw}
                      <button
                        type="button"
                        onClick={() => handleRemoveKeyword(kw)}
                        className="ml-0.5 rounded-full opacity-60 hover:opacity-100"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <Button onClick={handleSaveProfile} disabled={saving} className="mt-1">
              {saving ? 'Saving…' : 'Save Changes'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HubPage;
