-- Phase 1 — Pharmacy dispensing.
-- One row per dispense event against a CPOE medication order; the step that
-- closes the loop between e-prescribing and the e-MAR. Depleting the matching
-- formulary line is done by the BFF (server/db.decrementStock). Tenant-scoped;
-- RLS on, service_role BFF only.
create table if not exists public.dispenses (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references public.companies(id) on delete cascade,
  order_id      uuid not null references public.medication_orders(id) on delete cascade,
  encounter_id  uuid not null references public.encounters(id) on delete cascade,
  patient_id    text not null,
  formulary_id  integer,
  drug_name     text not null,
  quantity      integer not null default 1,
  dispensed_by  uuid references public.users(id) on delete set null,
  dispensed_at  timestamptz not null default now()
);
create index if not exists dispenses_company_idx
  on public.dispenses(company_id, dispensed_at);
create unique index if not exists dispenses_order_uq
  on public.dispenses(company_id, order_id);

alter table public.dispenses enable row level security;
