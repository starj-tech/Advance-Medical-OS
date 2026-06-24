-- Phase 1 — Nursing care plan (asuhan keperawatan).
-- One entry per encounter in the SDKI/SLKI/SIKI framing. Tenant-scoped; RLS on,
-- service_role BFF only.
create table if not exists public.nursing_care (
  id                uuid primary key default gen_random_uuid(),
  company_id        uuid not null references public.companies(id) on delete cascade,
  encounter_id      uuid not null references public.encounters(id) on delete cascade,
  patient_id        text not null,
  nursing_diagnosis text not null,
  goal              text not null,
  intervention      text not null,
  evaluation        text,
  authored_by       uuid references public.users(id) on delete set null,
  created_at        timestamptz not null default now()
);
create index if not exists nursing_care_encounter_idx
  on public.nursing_care(company_id, encounter_id, created_at);

alter table public.nursing_care enable row level security;
