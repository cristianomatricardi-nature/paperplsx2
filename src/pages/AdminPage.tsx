import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import {
  FileText,
  RefreshCw,
  Loader2,
  ShieldAlert,
  ChevronDown,
  ChevronRight,
  ArrowLeft,
  Download,
} from 'lucide-react';
import { format } from 'date-fns';

interface UserRow {
  id: string;
  full_name: string;
  email: string;
  created_at: string | null;
  papers: { id: number; title: string | null; created_at: string | null }[];
  persona_changed: boolean;
  protocol_opened: boolean;
  protocol_open_count: number;
  replication_used: boolean;
  analysis_used: boolean;
}

interface Summary {
  total_users: number;
  total_papers: number;
  pct_persona_changed: number;
  pct_protocol_opened: number;
  pct_replication_used: number;
  pct_analysis_used: number;
}

const BoolBadge = ({ value }: { value: boolean }) =>
  value ? (
    <Badge className="bg-primary/15 text-primary border-primary/30 hover:bg-primary/15">
      ✓ Yes
    </Badge>
  ) : (
    <span className="text-muted-foreground text-sm">—</span>
  );

const StatCard = ({ label, value, sub }: { label: string; value: string | number; sub?: string }) => (
  <Card className="bg-card border-border">
    <CardContent className="pt-5 pb-4 px-5">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">{label}</p>
      <p className="text-3xl font-bold text-foreground leading-none">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </CardContent>
  </Card>
);

const AdminPage = () => {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setForbidden(false);
    try {
      const { data, error } = await supabase.functions.invoke('admin-dashboard');
      if (error) {
        if (error.message?.includes('403') || (error as any)?.status === 403) {
          setForbidden(true);
          return;
        }
        // Try to parse the response body for 403
        const msg = (error as any)?.message ?? '';
        if (msg.includes('Forbidden')) {
          setForbidden(true);
          return;
        }
        throw error;
      }
      // Check if returned data contains a Forbidden error
      if (data?.error === 'Forbidden') {
        setForbidden(true);
        return;
      }
      setSummary(data.summary);
      setUsers(data.users);
      setLastUpdated(new Date());
    } catch (err: any) {
      console.error('Admin dashboard error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground">Loading admin dashboard…</span>
      </div>
    );
  }

  if (forbidden) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3 max-w-sm">
          <ShieldAlert className="h-12 w-12 text-destructive mx-auto" />
          <h1 className="text-xl font-semibold text-foreground">Access Denied</h1>
          <p className="text-sm text-muted-foreground">
            You don't have permission to view this page. Only admins can access the dashboard.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-muted-foreground hover:text-foreground"
              onClick={() => navigate('/researcher-home')}
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <div>
              <h1 className="text-lg font-semibold font-sans text-foreground">Admin Dashboard</h1>
              {lastUpdated && (
                <p className="text-xs text-muted-foreground">
                  Last updated: {format(lastUpdated, 'MMM d, yyyy HH:mm')}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => {
                const link = document.createElement('a');
                link.href = '/ARCHITECTURE.md';
                link.download = 'ARCHITECTURE.md';
                link.click();
              }}
            >
              <Download className="h-3.5 w-3.5" />
              Architecture Guide
            </Button>
            <Button variant="outline" size="sm" onClick={fetchData} className="gap-1.5">
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Summary grid */}
        {summary && (
          <div className="space-y-4">
            {/* Totals row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard
                label="Total Users"
                value={summary.total_users}
                sub="signed up"
              />
              <StatCard
                label="Total Papers"
                value={summary.total_papers}
                sub="uploaded"
              />
              <StatCard
                label="Persona Changed"
                value={`${summary.pct_persona_changed}%`}
                sub="of users"
              />
              <StatCard
                label="Protocol Opened"
                value={`${summary.pct_protocol_opened}%`}
                sub="of users"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <StatCard
                label="Replication Used"
                value={`${summary.pct_replication_used}%`}
                sub="of users"
              />
              <StatCard
                label="Analysis Used"
                value={`${summary.pct_analysis_used}%`}
                sub="of users"
              />
            </div>
          </div>
        )}

        {/* User activity table */}
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            User Activity
          </h2>
          <div className="rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="w-8" />
                  <TableHead className="font-semibold text-foreground">Name</TableHead>
                  <TableHead className="font-semibold text-foreground">Email</TableHead>
                  <TableHead className="font-semibold text-foreground">Signed Up</TableHead>
                  <TableHead className="font-semibold text-foreground text-center">Papers</TableHead>
                  <TableHead className="font-semibold text-foreground text-center">Persona Changed</TableHead>
                  <TableHead className="font-semibold text-foreground text-center">Protocol Opened</TableHead>
                  <TableHead className="font-semibold text-foreground text-center">Replication Used</TableHead>
                  <TableHead className="font-semibold text-foreground text-center">Analysis Used</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-12 text-sm">
                      No users found.
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => {
                    const isExpanded = expandedRows.has(user.id);
                    return (
                      <>
                        <TableRow
                          key={user.id}
                          className="cursor-pointer hover:bg-muted/30"
                          onClick={() => user.papers.length > 0 && toggleRow(user.id)}
                        >
                          <TableCell className="w-8">
                            {user.papers.length > 0 ? (
                              isExpanded ? (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              )
                            ) : null}
                          </TableCell>
                          <TableCell className="font-medium text-foreground">
                            {user.full_name || '—'}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {user.email}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {user.created_at ? format(new Date(user.created_at), 'MMM d, yyyy') : '—'}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="text-sm font-medium">{user.papers.length}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <BoolBadge value={user.persona_changed} />
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex flex-col items-center gap-1">
                              <BoolBadge value={user.protocol_opened} />
                              {user.protocol_opened && (
                                <span className="text-[10px] text-muted-foreground">
                                  {user.protocol_open_count}×
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <BoolBadge value={user.replication_used} />
                          </TableCell>
                          <TableCell className="text-center">
                            <BoolBadge value={user.analysis_used} />
                          </TableCell>
                        </TableRow>
                        {isExpanded && (
                          <TableRow key={`${user.id}-papers`} className="bg-muted/20">
                            <TableCell />
                            <TableCell colSpan={8} className="py-3 pl-4">
                              <div className="space-y-1">
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                  Papers uploaded
                                </p>
                                {user.papers.map((p) => (
                                  <div key={p.id} className="flex items-center gap-2 text-sm">
                                    <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                    <span className="text-foreground">{p.title ?? 'Untitled'}</span>
                                    {p.created_at && (
                                      <span className="text-muted-foreground text-xs ml-auto">
                                        {format(new Date(p.created_at), 'MMM d, yyyy')}
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPage;
