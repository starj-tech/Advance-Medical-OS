-- Phase 5 (farmasi & rantai pasok, Domain C) — Pharmacy procurement (PO → GR).
-- A purchase order has lines (item × ordered qty × unit price IDR); goods receipts
-- accumulate the received qty per line and book an inventory batch (0047). Fulfillment
-- is derived from received vs ordered. Tenant-scoped; RLS on, service_role BFF only.
create table if not exists public.purchase_orders (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  supplier    text not null,
  status      text not null default 'draft',
  note        text,
  created_by  uuid references public.users(id) on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists purchase_orders_company_idx on public.purchase_orders(company_id, created_at desc);

create table if not exists public.po_lines (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references public.companies(id) on delete cascade,
  po_id        uuid not null references public.purchase_orders(id) on delete cascade,
  item_id      uuid not null references public.inventory_items(id) on delete restrict,
  item_name    text not null,
  quantity     integer not null default 0,
  unit_price   integer not null default 0,
  received_qty integer not null default 0,
  created_at   timestamptz not null default now()
);
create index if not exists po_lines_po_idx on public.po_lines(company_id, po_id);

create table if not exists public.goods_receipts (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  po_id       uuid not null references public.purchase_orders(id) on delete cascade,
  line_id     uuid not null references public.po_lines(id) on delete cascade,
  item_id     uuid not null references public.inventory_items(id) on delete restrict,
  batch_no    text not null,
  quantity    integer not null default 0,
  expiry_date date not null,
  batch_id    uuid references public.inventory_batches(id) on delete set null,
  received_by uuid references public.users(id) on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists goods_receipts_po_idx on public.goods_receipts(company_id, po_id);

alter table public.purchase_orders enable row level security;
alter table public.po_lines enable row level security;
alter table public.goods_receipts enable row level security;
