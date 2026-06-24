-- Phase 1 — Discharge summary (resume medis pulang).
-- One per encounter — the structured closing record KARS/SNARS requires. Creating
-- it closes the encounter (BFF sets status finished). Tenant-scoped; RLS on,
-- service_role BFF only.
create table if not exists public.discharge_summaries (
  id               uuid primary key default gen_random_uuid(),
  company_id       uuid not null references public.companies(id) on delete cascade,
  encounter_id     uuid not null references public.encounters(id) on delete cascade,
  patient_id       text not null,
  condition        text not null,                 -- membaik|sembuh|dirujuk|pulang_paksa|meninggal
  clinical_summary text not null,
  treatment        text,
  follow_up        text,
  discharge_meds   text,
  authored_by      uuid references public.users(id) on delete set null,
  created_at       timestamptz not null default now()
);
create unique index if not exists discharge_summaries_encounter_uq
  on public.discharge_summaries(company_id, encounter_id);

alter table public.discharge_summaries enable row level security;
