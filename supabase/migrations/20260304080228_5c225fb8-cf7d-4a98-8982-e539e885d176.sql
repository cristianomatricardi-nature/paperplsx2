
create table public.infographic_jobs (
  id uuid primary key default gen_random_uuid(),
  paper_id bigint not null references public.papers(id) on delete cascade,
  sub_persona_id text not null default 'policy_advisor',
  status text not null default 'processing',
  image_url text,
  policy_relevance_score integer,
  reason text,
  debug jsonb,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.infographic_jobs enable row level security;

-- Authenticated users can read jobs for papers they can access
create policy "Authenticated users can read infographic jobs"
  on public.infographic_jobs for select to authenticated
  using (exists (
    select 1 from public.papers
    where papers.id = infographic_jobs.paper_id
      and (papers.user_id = auth.uid() or papers.status = 'completed')
  ));

-- Service role manages jobs (edge function uses service role key)
create policy "Service role full access"
  on public.infographic_jobs for all to service_role
  using (true) with check (true);
