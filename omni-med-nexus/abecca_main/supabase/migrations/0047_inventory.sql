-- Phase 5 (farmasi & rantai pasok, Domain C) — Pharmacy inventory.
-- An item is a stockable thing (drug/consumable); on-hand stock is the sum of its
-- batches. Each batch carries a lot no., quantity, and expiry date so the report can
-- raise reorder (vs reorder_point) and expiry alerts. Tenant-scoped; RLS on,
-- service_role BFF only.
create table if not exists public.inventory_items (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references public.companies(id) on delete cascade,
  name          text not null,
  unit          text not null,
  reorder_point integer not null default 0,
  created_by    uuid references public.users(id) on delete set null,
  created_at    timestamptz not null default now()
);
create index if not exists inventory_items_company_idx on public.inventory_items(company_id, name);

create table if not exists public.inventory_batches (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  item_id     uuid not null references public.inventory_items(id) on delete cascade,
  batch_no    text not null,
  quantity    integer not null default 0,
  expiry_date date not null,
  created_by  uuid references public.users(id) on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists inventory_batches_item_idx on public.inventory_batches(company_id, item_id, expiry_date);

alter table public.inventory_items enable row level security;
alter table public.inventory_batches enable row level security;
