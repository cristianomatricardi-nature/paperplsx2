import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use anon client to verify the JWT and get claims
    const anonClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = claimsData.claims.sub;

    // Use service-role client to check admin role
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: roleCheck } = await serviceClient.rpc('has_role', {
      _user_id: userId,
      _role: 'admin',
    });

    if (!roleCheck) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch all data in parallel
    const [profilesRes, authUsersRes, papersRes, eventsRes] = await Promise.all([
      serviceClient.from('profiles').select('id, full_name, created_at'),
      serviceClient.auth.admin.listUsers({ perPage: 1000 }),
      serviceClient.from('papers').select('id, user_id, title, created_at'),
      serviceClient.from('user_activity_events').select('user_id, event_type, paper_id'),
    ]);

    const profiles = profilesRes.data ?? [];
    const authUsers = authUsersRes.data?.users ?? [];
    const papers = papersRes.data ?? [];
    const events = eventsRes.data ?? [];

    // Build lookup maps
    const emailByUserId: Record<string, string> = {};
    for (const u of authUsers) {
      emailByUserId[u.id] = u.email ?? '';
    }

    const papersByUser: Record<string, typeof papers> = {};
    for (const p of papers) {
      if (!papersByUser[p.user_id]) papersByUser[p.user_id] = [];
      papersByUser[p.user_id].push(p);
    }

    // Group events by user
    const eventsByUser: Record<string, Set<string>> = {};
    const protocolOpensByUser: Record<string, Set<string>> = {};

    for (const e of events) {
      if (!eventsByUser[e.user_id]) eventsByUser[e.user_id] = new Set();
      eventsByUser[e.user_id].add(e.event_type);

      if (e.event_type === 'protocol_opened') {
        if (!protocolOpensByUser[e.user_id]) protocolOpensByUser[e.user_id] = new Set();
        // Track unique paper_ids for protocol opened
        protocolOpensByUser[e.user_id].add(String(e.paper_id));
      }
    }

    // Count total unique protocols per user (across papers)
    // We'll compute protocol_opened as boolean and % of unique event rows
    // For % opened: count distinct (paper_id + event per paper) — simplified: unique protocol_opened event rows / total module count
    // We'll just expose the count of times protocol was opened per user
    const protocolOpenCountByUser: Record<string, number> = {};
    for (const e of events) {
      if (e.event_type === 'protocol_opened') {
        protocolOpenCountByUser[e.user_id] = (protocolOpenCountByUser[e.user_id] ?? 0) + 1;
      }
    }

    // Build per-user rows
    const users = profiles.map((profile) => {
      const userEvents = eventsByUser[profile.id] ?? new Set();
      const userPapers = papersByUser[profile.id] ?? [];
      const protocolOpenCount = protocolOpenCountByUser[profile.id] ?? 0;

      return {
        id: profile.id,
        full_name: profile.full_name ?? 'Unknown',
        email: emailByUserId[profile.id] ?? '',
        created_at: profile.created_at,
        papers: userPapers.map((p) => ({ id: p.id, title: p.title, created_at: p.created_at })),
        persona_changed: userEvents.has('persona_changed'),
        protocol_opened: userEvents.has('protocol_opened'),
        protocol_open_count: protocolOpenCount,
        replication_used: userEvents.has('replication_used'),
        analysis_used: userEvents.has('analysis_used'),
      };
    });

    // Compute summary
    const totalUsers = users.length;
    const pct = (n: number) => totalUsers > 0 ? Math.round((n / totalUsers) * 1000) / 10 : 0;

    const summary = {
      total_users: totalUsers,
      total_papers: papers.length,
      pct_persona_changed: pct(users.filter((u) => u.persona_changed).length),
      pct_protocol_opened: pct(users.filter((u) => u.protocol_opened).length),
      pct_replication_used: pct(users.filter((u) => u.replication_used).length),
      pct_analysis_used: pct(users.filter((u) => u.analysis_used).length),
    };

    return new Response(JSON.stringify({ summary, users }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('admin-dashboard error:', err);
    return new Response(JSON.stringify({ error: err.message ?? 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
