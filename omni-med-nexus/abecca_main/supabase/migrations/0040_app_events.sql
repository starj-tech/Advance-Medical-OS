-- Phase 5 (observability lanjutan) — structured application event log. Events are
-- tenant-scoped by company_id (platform-level events may be null) and carry a
-- redacted JSONB field bag (secrets/PII masked at the source, see lib/observability).
-- Written best-effort by the BFF; surfaced on the /observability dashboard. RLS on,
-- service_role only.
create table if not exists public.app_events (
  id         uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  level      text not null,
  scope      text not null,
  message    text not null,
  user_id    uuid references public.users(id) on delete set null,
  request_id text,
  fields     jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists app_events_company_time_idx
  on public.app_events(company_id, created_at desc);
create index if not exists app_events_level_idx
  on public.app_events(company_id, level);

alter table public.app_events enable row level security;
