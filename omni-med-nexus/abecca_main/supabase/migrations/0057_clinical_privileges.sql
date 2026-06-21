-- Phase 5 (SDM, Domain J / KARS-KPS) — clinical privileging (Rincian Kewenangan Klinis).
-- Distinct from staff_credentials (which proves a licence): a privilege is the hospital's
-- internal authorisation for a named clinician to perform a specific procedure, moving
-- requested → granted → suspended. A granted privilege lapses past its review_by date
-- (derived in lib/privileging). Tenant-scoped; RLS on, service_role BFF.
create table if not exists public.clinical_privileges (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  staff_name  text not null,
  category    text not null,
  privilege   text not null,
  status      text not null default 'requested',
  review_by   date,
  notes       text,
  created_at  timestamptz not null default now()
);
create index if not exists clinical_privileges_company_idx on public.clinical_privileges(company_id, status);

alter table public.clinical_privileges enable row level security;
