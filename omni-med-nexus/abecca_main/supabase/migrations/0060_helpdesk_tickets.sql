-- Phase 5 (Aset & Biomedik / TI, Domain K) — IT helpdesk / service-desk tickets.
-- Each ticket carries a priority (which sets a first-response SLA target in hours, derived
-- in lib/helpdesk) and a status lifecycle; the first move off 'open' stamps
-- first_response_at, which freezes the response-SLA outcome. Tenant-scoped; RLS on.
create table if not exists public.helpdesk_tickets (
  id                uuid primary key default gen_random_uuid(),
  company_id        uuid not null references public.companies(id) on delete cascade,
  reporter          text not null,
  category          text not null,
  priority          text not null,
  subject           text not null,
  description       text,
  status            text not null default 'open',
  assigned_to       text,
  resolution        text,
  first_response_at timestamptz,
  created_at        timestamptz not null default now()
);
create index if not exists helpdesk_tickets_company_idx on public.helpdesk_tickets(company_id, status);

alter table public.helpdesk_tickets enable row level security;
