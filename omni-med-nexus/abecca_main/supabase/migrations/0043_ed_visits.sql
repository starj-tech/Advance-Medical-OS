-- Phase 5 (IGD/ED) — emergency department triage + tracking board. A walk-in is
-- triaged with the ESI algorithm (level + rationale recomputed server-side), then
-- tracked through first doctor contact (door-to-doctor) to disposition. Tenant-
-- scoped; RLS on, service_role BFF only.
create table if not exists public.ed_visits (
  id             uuid primary key default gen_random_uuid(),
  company_id     uuid not null references public.companies(id) on delete cascade,
  patient_id     text not null,
  complaint      text not null,
  esi_level      integer not null,
  esi_rationale  text not null,
  status         text not null default 'waiting',
  disposition    text,
  arrival_at     timestamptz not null default now(),
  doctor_seen_at timestamptz,
  disposition_at timestamptz,
  created_by     uuid references public.users(id) on delete set null
);
create index if not exists ed_visits_board_idx
  on public.ed_visits(company_id, status, esi_level, arrival_at);

alter table public.ed_visits enable row level security;
