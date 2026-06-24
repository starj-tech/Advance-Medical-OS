-- Phase 1 — integrated clinical progress notes (CPPT / SOAP).
-- Each note is authored by a PPA (Profesional Pemberi Asuhan) against one
-- encounter, in SOAP form. Tenant-scoped; RLS on, service_role BFF only.
create table if not exists public.clinical_notes (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references public.companies(id) on delete cascade,
  encounter_id uuid not null references public.encounters(id) on delete cascade,
  patient_id   uuid not null,
  author_id    uuid references public.users(id) on delete set null,
  author_role  text,                              -- snapshot label for display
  note_type    text not null default 'cppt',      -- cppt|soap|progress|nursing
  subjective   text,
  objective    text,
  assessment   text,
  plan         text,
  created_at   timestamptz not null default now()
);
create index if not exists clinical_notes_encounter_idx
  on public.clinical_notes(company_id, encounter_id, created_at);
create index if not exists clinical_notes_patient_idx
  on public.clinical_notes(company_id, patient_id, created_at desc);

alter table public.clinical_notes enable row level security;
