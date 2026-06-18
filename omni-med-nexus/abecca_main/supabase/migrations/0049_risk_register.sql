-- Phase 5 (mutu & keselamatan, Domain I / KARS-PMKP) — corporate risk register.
-- Proactive companion to the reactive IKP module: each risk carries a likelihood and
-- consequence (1–5); the score (l×c) and band are derived in app code (lib/risk-matrix)
-- so the 5×5 heatmap and grading stay consistent. Tenant-scoped; RLS on, service_role BFF.
create table if not exists public.risk_entries (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  title       text not null,
  category    text not null,
  description text,
  likelihood  integer not null default 1,
  consequence integer not null default 1,
  owner       text,
  mitigation  text,
  status      text not null default 'identified',
  created_by  uuid references public.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists risk_entries_company_idx on public.risk_entries(company_id, status);

alter table public.risk_entries enable row level security;
