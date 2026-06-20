-- Phase 5 (mutu & keselamatan, Domain I / KARS-PPRA) — antimicrobial stewardship.
-- Second pillar of PPI alongside HAI surveillance: a line-list of antibiotic consumption
-- (grams per drug per month) and a monthly patient-days denominator are combined into
-- DDD-per-100-patient-days + a WHO AWaRe roll-up in app code (lib/antimicrobial).
-- Tenant-scoped; RLS on, service_role BFF.
create table if not exists public.amr_consumption (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references public.companies(id) on delete cascade,
  period        text not null,            -- YYYY-MM
  drug_code     text not null,            -- WHO ATC code
  consumed_grams numeric not null default 0,
  created_at    timestamptz not null default now()
);
create index if not exists amr_consumption_company_idx on public.amr_consumption(company_id, period);

create table if not exists public.amr_patient_days (
  company_id   uuid not null references public.companies(id) on delete cascade,
  period       text not null,             -- YYYY-MM
  patient_days integer not null default 0,
  primary key (company_id, period)
);

alter table public.amr_consumption enable row level security;
alter table public.amr_patient_days enable row level security;
