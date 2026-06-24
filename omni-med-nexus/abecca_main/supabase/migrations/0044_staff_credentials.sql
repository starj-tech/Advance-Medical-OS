-- Phase 5 (HR/credentialing, Domain J) — health-worker credential registry. Tracks
-- the Indonesian practice licences (STR/SIP/SIPA/…) a facility must keep current
-- for KARS accreditation; validity status is derived from expiry_date at read time
-- (not stored). Tenant-scoped; RLS on, service_role BFF only.
create table if not exists public.staff_credentials (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references public.companies(id) on delete cascade,
  staff_name      text not null,
  profession      text not null,
  credential_type text not null,
  number          text not null,
  issued_date     date,
  expiry_date     date not null,
  notes           text,
  created_by      uuid references public.users(id) on delete set null,
  created_at      timestamptz not null default now()
);
create index if not exists staff_credentials_expiry_idx
  on public.staff_credentials(company_id, expiry_date);

alter table public.staff_credentials enable row level security;
