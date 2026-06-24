-- Phase 1 — Medication Administration Record (e-MAR).
-- One row per administration event against a medication order; the running
-- record of the "5 benar" (right patient/drug/dose/route/time). Tenant-scoped;
-- RLS on, service_role BFF only.
create table if not exists public.medication_administrations (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references public.companies(id) on delete cascade,
  order_id        uuid not null references public.medication_orders(id) on delete cascade,
  encounter_id    uuid not null references public.encounters(id) on delete cascade,
  patient_id      text not null,
  status          text not null default 'given',   -- given|held|refused|missed
  dose_given      text,
  note            text,
  administered_by uuid references public.users(id) on delete set null,
  administered_at timestamptz not null default now()
);
create index if not exists med_admin_encounter_idx
  on public.medication_administrations(company_id, encounter_id, administered_at);
create index if not exists med_admin_order_idx
  on public.medication_administrations(company_id, order_id, administered_at);

alter table public.medication_administrations enable row level security;
