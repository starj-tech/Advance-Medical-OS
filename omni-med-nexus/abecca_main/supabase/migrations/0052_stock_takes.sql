-- Phase 5 (farmasi & rantai pasok, Domain C / WS19) — stock-take (opname) register.
-- Each count snapshots a batch's system on-hand (system_qty) against the physically
-- counted quantity; the signed variance is stored and the snapshot makes the record an
-- immutable audit even after later movements. Applying sets the batch to counted_qty
-- (app code). Tenant-scoped; RLS on, service_role BFF only.
create table if not exists public.stock_takes (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  batch_id    uuid not null references public.inventory_batches(id) on delete cascade,
  item_id     uuid not null references public.inventory_items(id) on delete cascade,
  batch_no    text not null,
  system_qty  integer not null default 0,
  counted_qty integer not null default 0,
  variance    integer not null default 0,
  applied     boolean not null default false,
  note        text,
  counted_by  uuid references public.users(id) on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists stock_takes_company_idx on public.stock_takes(company_id, item_id, created_at desc);

alter table public.stock_takes enable row level security;
