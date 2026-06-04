-- Phase 1 — tenant-scoped ward & bed master data + occupancy (bed board / BOR).
-- Named ward_units / ward_beds to avoid colliding with the legacy, non-tenant
-- `wards` table from the original core schema. RLS on, service_role BFF only.
create table if not exists public.ward_units (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  name        text not null,
  ward_class  text,                              -- VIP|Kelas 1|2|3|ICU|IGD ...
  created_at  timestamptz not null default now()
);
create index if not exists ward_units_company_idx on public.ward_units(company_id, name);

create table if not exists public.ward_beds (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references public.companies(id) on delete cascade,
  ward_id      uuid not null references public.ward_units(id) on delete cascade,
  label        text not null,
  status       text not null default 'available', -- available|occupied|cleaning|blocked
  patient_id   text,
  encounter_id uuid,
  updated_at   timestamptz not null default now()
);
create index if not exists ward_beds_ward_idx on public.ward_beds(company_id, ward_id, label);

alter table public.ward_units enable row level security;
alter table public.ward_beds enable row level security;
