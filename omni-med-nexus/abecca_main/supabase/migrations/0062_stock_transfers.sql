-- Phase 5 (farmasi/supply-chain, Domain C / WS19) — inter-depot stock transfers.
-- Adds an optional storage location to inventory batches (null = main store), then an
-- immutable transfer ledger. A transfer is atomic in app code: the source batch is drawn
-- down and an equal batch (same lot/expiry) is booked at the destination location, so total
-- on-hand stock is conserved. Tenant-scoped; RLS on, service_role BFF.
alter table public.inventory_batches add column if not exists location text;

create table if not exists public.stock_transfers (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references public.companies(id) on delete cascade,
  item_id       uuid not null references public.inventory_items(id) on delete cascade,
  item_name     text not null,
  batch_no      text not null,
  from_location text not null,
  to_location   text not null,
  quantity      integer not null,
  created_by    uuid references public.users(id) on delete set null,
  created_at    timestamptz not null default now()
);
create index if not exists stock_transfers_company_idx on public.stock_transfers(company_id, created_at desc);

alter table public.stock_transfers enable row level security;
