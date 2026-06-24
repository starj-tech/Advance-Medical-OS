-- Phase 5 (Aset & Biomedik / pengadaan, Domain K) — vendor contract register.
-- Each contract carries a value, period, and admin status (active/terminated); while active,
-- the renewal/expiry state is derived from end_date (lib/contracts) so the board surfaces
-- lapses before they happen. Tenant-scoped; RLS on, service_role BFF.
create table if not exists public.vendor_contracts (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  vendor      text not null,
  title       text not null,
  type        text not null,
  value       numeric not null default 0,
  start_date  date,
  end_date    date,
  status      text not null default 'active',
  notes       text,
  created_at  timestamptz not null default now()
);
create index if not exists vendor_contracts_company_idx on public.vendor_contracts(company_id, end_date);

alter table public.vendor_contracts enable row level security;
