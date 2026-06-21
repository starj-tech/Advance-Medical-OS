-- Phase 5 (Aset & Biomedik, Domain K / KARS-MFK) — biomedical asset & calibration register.
-- Medical-equipment inventory (IPSRS) with operational status and a calibration/maintenance
-- schedule; the calibration state (ok/due_soon/overdue) is derived from next_due in app code
-- (lib/biomedical) so the board never shows a stale "ok". Tenant-scoped; RLS on.
create table if not exists public.biomedical_assets (
  id               uuid primary key default gen_random_uuid(),
  company_id       uuid not null references public.companies(id) on delete cascade,
  name             text not null,
  category         text not null,
  location         text not null,
  serial_no        text,
  status           text not null default 'operational',
  last_maintenance date,
  next_due         date,
  notes            text,
  created_at       timestamptz not null default now()
);
create index if not exists biomedical_assets_company_idx on public.biomedical_assets(company_id, next_due);

alter table public.biomedical_assets enable row level security;
