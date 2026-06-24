-- Phase 5 (mutu & keselamatan, Domain I / KARS-PMKP) — patient complaint / grievance register.
-- Companion to the IKP & risk modules: each complaint carries a category + severity (which
-- sets the resolution-time SLA target) and a status lifecycle; reaching resolved/closed stamps
-- resolved_at, which freezes the SLA outcome (met/breached, derived in lib/complaints).
-- Tenant-scoped; RLS on, service_role BFF.
create table if not exists public.complaints (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  patient_id  text,
  reporter    text not null,
  category    text not null,
  severity    text not null,
  subject     text not null,
  description text,
  status      text not null default 'open',
  assigned_to text,
  resolution  text,
  resolved_at timestamptz,
  created_by  uuid references public.users(id) on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists complaints_company_idx on public.complaints(company_id, status);

alter table public.complaints enable row level security;
