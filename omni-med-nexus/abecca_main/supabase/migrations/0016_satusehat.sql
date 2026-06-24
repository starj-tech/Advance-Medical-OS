-- Phase 2 — SATUSEHAT FHIR submission log (one row per posted resource).
-- Tenant-scoped; RLS on, service_role BFF only.
create table if not exists public.satusehat_submissions (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references public.companies(id) on delete cascade,
  encounter_id  uuid not null references public.encounters(id) on delete cascade,
  patient_id    text not null,
  resource_type text not null,                   -- Encounter|Condition|Observation
  fhir_id       text,
  status        text not null default 'sent',     -- sent|failed
  is_mock       boolean not null default false,
  error         text,
  created_by    uuid references public.users(id) on delete set null,
  created_at    timestamptz not null default now()
);
create index if not exists satusehat_encounter_idx
  on public.satusehat_submissions(company_id, encounter_id, created_at desc);

alter table public.satusehat_submissions enable row level security;
