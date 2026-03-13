import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import UploadSection from '@/components/researcher-home/UploadSection';
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
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import {
  Bell,
  User,
  FlaskConical,
  ExternalLink,
  ShieldCheck,
  LogOut,
  ChevronRight,
} from 'lucide-react';

const ResearcherHomePage = () => {
  const { user, profile, loading, signOut } = useAuth();
  const { isAdmin } = useUserRole();
  const navigate = useNavigate();
  const [editOpen, setEditOpen] = useState(false);

  // Edit profile form state
  const [editName, setEditName] = useState('');
  const [editInstitution, setEditInstitution] = useState('');
  const [editOrcid, setEditOrcid] = useState('');
  const [saving, setSaving] = useState(false);

  const openEditDialog = useCallback(() => {
    setEditName(profile?.full_name || '');
    setEditInstitution(profile?.institution || '');
    setEditOrcid(profile?.orcid || '');
    setEditOpen(true);
  }, [profile]);

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: editName.trim() || null,
          institution: editInstitution.trim() || null,
          orcid: editOrcid.trim() || null,
        })
        .eq('id', user.id);
      if (error) throw error;
      toast({ title: 'Profile updated' });
      setEditOpen(false);
    } catch (err: any) {
      toast({ title: 'Save failed', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handlePaperAdded = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

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
      {/* ── Top Navigation Bar ── */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <span className="font-serif text-xl font-bold tracking-tight text-foreground">
            Paper<span className="text-primary">+</span>
          </span>

          {/* Right side actions */}
          <div className="flex items-center gap-1">
            {/* Notifications (decorative) */}
            <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
              <Bell className="h-4 w-4" />
              <span className="hidden text-sm sm:inline">Notifications</span>
            </Button>

            {/* Account dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span className="hidden text-sm sm:inline">Account</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem onClick={openEditDialog}>
                  <User className="mr-2 h-4 w-4" />
                  Edit Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/digital-lab')}>
                  <FlaskConical className="mr-2 h-4 w-4" />
                  Digital Lab
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate(`/profile/${user.id}`)}>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  View Public Profile
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
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* ── Hero Identity Banner ── */}
      <div className="w-full" style={{ background: 'linear-gradient(100deg, hsl(var(--hero-teal)) 0%, hsl(var(--hero-teal-mid)) 60%, hsl(197 55% 36%) 100%)' }}>
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <div className="mb-4 flex items-center gap-1 text-xs" style={{ color: 'hsl(var(--hero-teal-foreground) / 0.65)' }}>
            <button
              onClick={() => navigate('/hub')}
              className="hover:underline underline-offset-2 transition-opacity hover:opacity-100 opacity-80"
            >
              Home
            </button>
            <ChevronRight className="h-3 w-3" />
            <span>My Account</span>
          </div>

          <div className="flex items-center gap-5">
            {/* Outline avatar */}
            <div
              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full"
              style={{ border: '2px solid hsl(var(--hero-teal-foreground) / 0.7)' }}
            >
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={displayName}
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                <span className="font-serif text-xl font-semibold" style={{ color: 'hsl(var(--hero-teal-foreground))' }}>
                  {initials}
                </span>
              )}
            </div>

            {/* Identity text */}
            <div className="flex-1">
              <h1 className="font-serif text-2xl font-bold leading-tight" style={{ color: 'hsl(var(--hero-teal-foreground))' }}>
                {displayName}
              </h1>
              <p className="mt-0.5 text-sm" style={{ color: 'hsl(var(--hero-teal-foreground) / 0.75)' }}>
                {user.email}
              </p>
              {profile?.institution && (
                <p className="mt-0.5 text-xs" style={{ color: 'hsl(var(--hero-teal-foreground) / 0.65)' }}>
                  {profile.institution}
                </p>
              )}
            </div>

            {/* Admin badge */}
            {isAdmin && (
              <Button
                size="sm"
                variant="outline"
                className="hidden shrink-0 gap-1.5 border-white/30 text-xs sm:flex"
                style={{ color: 'hsl(var(--hero-teal-foreground))', background: 'hsl(var(--hero-teal-foreground) / 0.1)' }}
                onClick={() => navigate('/admin')}
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                Admin Dashboard
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ── Main Content ── */}
      <main className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        <UploadSection userId={user.id} onPaperAdded={handlePaperAdded} />
        <PaperLibrary userId={user.id} refreshKey={refreshKey} />
      </main>

      {/* Edit Profile Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription>Update your researcher profile information.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-name">Full Name</Label>
              <Input id="edit-name" value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-institution">Institution</Label>
              <Input id="edit-institution" value={editInstitution} onChange={(e) => setEditInstitution(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-orcid">ORCID</Label>
              <Input id="edit-orcid" placeholder="0000-0000-0000-0000" value={editOrcid} onChange={(e) => setEditOrcid(e.target.value)} />
            </div>
            <Button onClick={handleSaveProfile} disabled={saving} className="mt-2">
              {saving ? 'Saving…' : 'Save Changes'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ResearcherHomePage;
