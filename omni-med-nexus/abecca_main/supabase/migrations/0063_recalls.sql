-- Drug/lot recall (Domain C/WS19). A recall targets a manufacturer lot number; it snapshots
-- the affected on-hand batches across all depots at issue time, and records the quantity
-- withdrawn when executed. Withdrawal zeroes the matching inventory_batches (handled in app).
-- Tenant-scoped; RLS on (app-layer isolation by company_id, service_role bypass).

create table if not exists public.recalls (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  lot_no text not null,
  item_name text not null default '—',
  reason text not null,
  status text not null default 'open',          -- open | completed
  batch_count integer not null default 0,        -- affected batches at issue
  total_quantity integer not null default 0,     -- affected on-hand qty at issue
  withdrawn_quantity integer not null default 0, -- qty actually pulled on execution
  issued_by uuid references public.users(id),
  issued_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists recalls_company_idx on public.recalls (company_id, issued_at desc);
create index if not exists recalls_lot_idx on public.recalls (company_id, lot_no);

alter table public.recalls enable row level security;
