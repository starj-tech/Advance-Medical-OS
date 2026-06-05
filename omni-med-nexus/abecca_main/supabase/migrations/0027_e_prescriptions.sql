-- Phase 3 — Electronic prescription export (e-resep ke apotek luar).
-- Snapshots an encounter's active CPOE medication orders into one shareable
-- prescription with a human-readable code, an optional external pharmacy and a
-- status running issued → dispensed / cancelled. Items are denormalised as jsonb
-- so the script is a stable record independent of later order edits.
-- Tenant-scoped; RLS on, service_role BFF only.
create table if not exists public.e_prescriptions (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references public.companies(id) on delete cascade,
  encounter_id  uuid not null references public.encounters(id) on delete cascade,
  patient_id    text not null,
  code          text not null,
  pharmacy      text,
  items         jsonb not null default '[]'::jsonb,
  status        text not null default 'issued'
                  check (status in ('issued', 'dispensed', 'cancelled')),
  issued_by     uuid references public.users(id) on delete set null,
  created_at    timestamptz not null default now()
);
create index if not exists e_prescriptions_encounter_idx
  on public.e_prescriptions(company_id, encounter_id, created_at);
create unique index if not exists e_prescriptions_code_idx
  on public.e_prescriptions(company_id, code);

alter table public.e_prescriptions enable row level security;
