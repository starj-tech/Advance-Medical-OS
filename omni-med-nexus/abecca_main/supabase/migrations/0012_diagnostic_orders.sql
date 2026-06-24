-- Phase 1 — lab & radiology (diagnostic) orders with a result lifecycle.
-- ordered -> collected -> in_progress -> resulted -> verified (or cancelled).
-- Tenant-scoped; RLS on, service_role BFF only.
create table if not exists public.diagnostic_orders (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references public.companies(id) on delete cascade,
  encounter_id  uuid not null references public.encounters(id) on delete cascade,
  patient_id    text not null,
  category      text not null,                    -- lab|radiology
  test_code     text not null,
  test_name     text not null,
  priority      text not null default 'routine',  -- routine|urgent|stat
  status        text not null default 'ordered',
  result_value  text,
  result_note   text,
  ordered_by    uuid references public.users(id) on delete set null,
  resulted_by   uuid references public.users(id) on delete set null,
  ordered_at    timestamptz not null default now(),
  resulted_at   timestamptz
);
create index if not exists diagnostic_orders_encounter_idx
  on public.diagnostic_orders(company_id, encounter_id, ordered_at);

alter table public.diagnostic_orders enable row level security;
