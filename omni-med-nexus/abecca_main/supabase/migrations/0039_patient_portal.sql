-- Phase 5 (patient portal) — self-service access for patients, separate from the
-- staff login. Front-desk staff issue a one-time-display access code per patient
-- (only its sha256 hash is stored); the patient signs in at /portal and gets an
-- opaque portal session (again, only the token hash is persisted). Both tables are
-- tenant-scoped; RLS on, service_role BFF only.
create table if not exists public.portal_access (
  company_id    uuid not null references public.companies(id) on delete cascade,
  patient_id    text not null,
  code_hash     text not null,
  issued_by     uuid references public.users(id) on delete set null,
  created_at    timestamptz not null default now(),
  last_login_at timestamptz,
  primary key (company_id, patient_id)
);
alter table public.portal_access enable row level security;

create table if not exists public.portal_sessions (
  token_hash text primary key,
  company_id uuid not null references public.companies(id) on delete cascade,
  patient_id text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists portal_sessions_company_idx
  on public.portal_sessions(company_id, patient_id);
alter table public.portal_sessions enable row level security;
