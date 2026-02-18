import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import ProfileCard from '@/components/researcher-home/ProfileCard';
import UploadSection from '@/components/researcher-home/UploadSection';
import PaperLibrary from '@/components/researcher-home/PaperLibrary';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { ShieldCheck } from 'lucide-react';

const ResearcherHomePage = () => {
  const { user, profile, loading } = useAuth();
  const { isAdmin } = useUserRole();
  const navigate = useNavigate();
  const [editOpen, setEditOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

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
      // Force a page-level refresh to pick up new profile data
      setRefreshKey((k) => k + 1);
    } catch (err: any) {
      toast({ title: 'Save failed', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handlePaperAdded = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background" key={refreshKey}>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Admin banner */}
        {isAdmin && (
          <div className="mb-6 flex items-center justify-between rounded-xl border border-border bg-muted/40 px-4 py-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <span>You have admin access.</span>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs"
              onClick={() => navigate('/admin')}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              Admin Dashboard
            </Button>
          </div>
        )}
        {/* Two-column layout: profile sidebar + main content */}
        <div className="flex flex-col gap-8 lg:flex-row">
          {/* Left column — sticky profile card */}
          <aside className="w-full shrink-0 lg:sticky lg:top-8 lg:w-[300px] lg:self-start">
            <ProfileCard
              userId={user.id}
              fullName={profile?.full_name ?? null}
              email={user.email || ''}
              avatarUrl={profile?.avatar_url ?? null}
              institution={profile?.institution ?? null}
              orcid={profile?.orcid ?? null}
              onEditProfile={openEditDialog}
            />
          </aside>

          {/* Right column — upload + library */}
          <main className="flex-1 space-y-8">
            <UploadSection userId={user.id} onPaperAdded={handlePaperAdded} />
            <PaperLibrary userId={user.id} refreshKey={refreshKey} />
          </main>
        </div>
      </div>

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
            <Button onClick={handleSaveProfile} disabled={saving} className="mt-2 bg-[hsl(var(--deep-blue))] hover:bg-[hsl(var(--deep-blue)/.85)] text-[hsl(var(--deep-blue-foreground))]">
              {saving ? 'Saving…' : 'Save Changes'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ResearcherHomePage;
