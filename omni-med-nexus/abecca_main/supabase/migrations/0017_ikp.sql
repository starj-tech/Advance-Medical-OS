-- Phase 2 — IKP (Insiden Keselamatan Pasien) reports. KARS patient-safety.
-- Tenant-scoped; RLS on, service_role BFF only.
create table if not exists public.ikp_reports (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references public.companies(id) on delete cascade,
  incident_type text not null,                   -- KPC|KNC|KTC|KTD|sentinel
  title         text not null,
  description   text,
  location      text,
  patient_id    text,
  incident_date date,
  grading       text,                            -- biru|hijau|kuning|merah (risk grading)
  status        text not null default 'reported', -- reported|investigating|closed
  reported_by   uuid references public.users(id) on delete set null,
  created_at    timestamptz not null default now()
);
create index if not exists ikp_company_idx
  on public.ikp_reports(company_id, created_at desc);

alter table public.ikp_reports enable row level security;
