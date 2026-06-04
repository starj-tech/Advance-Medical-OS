-- Phase 1 — CPOE medication orders (e-prescribing).
-- One row per prescribed drug on an encounter. Safety screening (allergy /
-- interaction / duplicate) runs in the BFF at order time; override_reason
-- records why a prescriber proceeded past a high-severity alert (accreditation
-- evidence). Tenant-scoped; RLS on, service_role BFF only.
create table if not exists public.medication_orders (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references public.companies(id) on delete cascade,
  encounter_id    uuid not null references public.encounters(id) on delete cascade,
  patient_id      text not null,
  formulary_id    integer,
  drug_name       text not null,
  dose            text,
  route           text,
  frequency       text,
  status          text not null default 'active',   -- active|held|stopped
  prescriber_id   uuid references public.users(id) on delete set null,
  override_reason text,
  created_at      timestamptz not null default now(),
  stopped_at      timestamptz
);
create index if not exists medication_orders_encounter_idx
  on public.medication_orders(company_id, encounter_id, created_at);

alter table public.medication_orders enable row level security;
