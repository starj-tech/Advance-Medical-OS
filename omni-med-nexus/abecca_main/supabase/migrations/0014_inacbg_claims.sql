-- Phase 2 — INA-CBG case-mix claims per encounter (illustrative grouper).
-- Tenant-scoped; RLS on, service_role BFF only.
create table if not exists public.inacbg_claims (
  id                uuid primary key default gen_random_uuid(),
  company_id        uuid not null references public.companies(id) on delete cascade,
  encounter_id      uuid not null references public.encounters(id) on delete cascade,
  patient_id        text not null,
  cbg_code          text not null,
  cbg_description   text not null,
  care_class        text not null,                 -- 3|2|1|vip
  tariff            bigint not null default 0,      -- IDR package tariff
  primary_diagnosis text,                           -- ICD-10 used for grouping
  status            text not null default 'draft',  -- draft|submitted|approved|rejected
  created_by        uuid references public.users(id) on delete set null,
  created_at        timestamptz not null default now()
);
create index if not exists inacbg_claims_encounter_idx
  on public.inacbg_claims(company_id, encounter_id, created_at desc);

alter table public.inacbg_claims enable row level security;
