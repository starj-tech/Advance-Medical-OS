-- Phase 5 (mutu/akreditasi, Domain I) — Indikator Nasional Mutu (INM) entries.
-- One numerator/denominator value per indicator per period (unique on
-- company+period+code → upsert); achievement % vs the national target is computed
-- from the catalogue (lib/inm). Tenant-scoped; RLS on, service_role BFF only.
create table if not exists public.inm_entries (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  period      text not null,
  code        text not null,
  numerator   integer not null default 0,
  denominator integer not null default 0,
  note        text,
  created_by  uuid references public.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  unique (company_id, period, code)
);
create index if not exists inm_entries_idx on public.inm_entries(company_id, period);

alter table public.inm_entries enable row level security;
