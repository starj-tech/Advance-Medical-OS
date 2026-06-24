-- Phase 2 — patient billing: charges + payments accumulated per encounter (IDR).
-- Amounts are integer rupiah. Tenant-scoped; RLS on, service_role BFF only.
create table if not exists public.bill_charges (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references public.companies(id) on delete cascade,
  encounter_id  uuid not null references public.encounters(id) on delete cascade,
  patient_id    text not null,
  description   text not null,
  category      text not null default 'other',   -- tariff|medication|diagnostic|room|other
  unit_price    bigint not null default 0,        -- IDR
  qty           integer not null default 1,
  amount        bigint not null default 0,        -- IDR (unit_price * qty)
  created_by    uuid references public.users(id) on delete set null,
  created_at    timestamptz not null default now()
);
create index if not exists bill_charges_encounter_idx
  on public.bill_charges(company_id, encounter_id, created_at);

create table if not exists public.bill_payments (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references public.companies(id) on delete cascade,
  encounter_id  uuid not null references public.encounters(id) on delete cascade,
  patient_id    text not null,
  method        text not null default 'cash',     -- cash|qris|transfer|card|insurance
  amount        bigint not null default 0,        -- IDR
  received_by   uuid references public.users(id) on delete set null,
  created_at    timestamptz not null default now()
);
create index if not exists bill_payments_encounter_idx
  on public.bill_payments(company_id, encounter_id, created_at);

alter table public.bill_charges enable row level security;
alter table public.bill_payments enable row level security;
