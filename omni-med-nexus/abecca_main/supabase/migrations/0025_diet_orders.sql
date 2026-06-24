-- Phase 1 — Nutrition / diet orders (order diet & terapi gizi).
-- One row per dietary prescription within an encounter: diet type, feeding route
-- (oral / enteral / parenteral), optional calorie target and restrictions. An
-- order is active until discontinued. Tenant-scoped; RLS on, service_role BFF only.
create table if not exists public.diet_orders (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references public.companies(id) on delete cascade,
  encounter_id  uuid not null references public.encounters(id) on delete cascade,
  patient_id    text not null,
  diet_type     text not null,
  route         text not null
                  check (route in ('oral', 'enteral', 'parenteral')),
  calories_kcal integer,
  restrictions  text,
  status        text not null default 'active'
                  check (status in ('active', 'discontinued')),
  ordered_by    uuid references public.users(id) on delete set null,
  created_at    timestamptz not null default now()
);
create index if not exists diet_orders_encounter_idx
  on public.diet_orders(company_id, encounter_id, created_at);

alter table public.diet_orders enable row level security;
