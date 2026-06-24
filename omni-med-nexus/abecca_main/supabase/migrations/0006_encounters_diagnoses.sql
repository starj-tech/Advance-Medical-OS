-- Phase 0 — clinical backbone: encounters (visits) + structured ICD-10 diagnoses.
-- Tenant-scoped by company_id; RLS on, no anon policy (service_role BFF).

create table if not exists public.encounters (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references public.companies(id) on delete cascade,
  patient_id    text not null,
  type          text not null,                       -- outpatient|inpatient|ed|odc
  status        text not null default 'in_progress', -- planned|in_progress|finished|cancelled
  ward          text,
  bed           text,
  dpjp_user_id  uuid references public.users(id),
  started_at    timestamptz not null default now(),
  ended_at      timestamptz,
  created_at    timestamptz not null default now()
);
create index if not exists encounters_patient_idx on public.encounters(company_id, patient_id);

create table if not exists public.diagnoses (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references public.companies(id) on delete cascade,
  encounter_id  uuid not null references public.encounters(id) on delete cascade,
  patient_id    text not null,
  code          text not null,                       -- ICD-10
  description   text not null,
  rank          text not null default 'secondary',   -- primary|secondary
  created_by    uuid references public.users(id),
  created_at    timestamptz not null default now()
);
create index if not exists diagnoses_encounter_idx on public.diagnoses(encounter_id);

alter table public.encounters enable row level security;
alter table public.diagnoses  enable row level security;
