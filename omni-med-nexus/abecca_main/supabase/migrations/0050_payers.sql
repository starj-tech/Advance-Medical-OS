-- Phase 5 (revenue cycle global, Domain H) — multi-payer registry.
-- Generic, country-agnostic payers with a coverage policy + currency, complementing the
-- Indonesia-only INA-CBG grouper. The covered/patient split is computed in app code
-- (lib/payers.estimateCoverage). Tenant-scoped; RLS on, service_role BFF only.
create table if not exists public.payers (
  id                 uuid primary key default gen_random_uuid(),
  company_id         uuid not null references public.companies(id) on delete cascade,
  name               text not null,
  payer_type         text not null default 'private_insurance',
  scheme             text not null default 'fee_for_service',
  currency           text not null default 'IDR',
  coverage_percent   integer not null default 0,
  deductible         integer not null default 0,
  copay              integer not null default 0,
  ceiling            integer,
  eligibility_status text not null default 'unknown',
  active             boolean not null default true,
  created_by         uuid references public.users(id) on delete set null,
  created_at         timestamptz not null default now()
);
create index if not exists payers_company_idx on public.payers(company_id, active, name);

alter table public.payers enable row level security;
