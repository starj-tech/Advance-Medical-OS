-- Phase 5 (SDM, Domain J) — staff directory.
-- A tenant-scoped roster of all hospital personnel, distinct from the `users` login table;
-- pairs with staff_credentials (who is licensed) by answering "who works here". The
-- employment status drives the directory's active/on-leave/inactive view.
-- Tenant-scoped; RLS on, service_role BFF.
create table if not exists public.staff_directory (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  name        text not null,
  profession  text not null,
  unit        text,
  phone       text,
  email       text,
  status      text not null default 'active',
  created_at  timestamptz not null default now()
);
create index if not exists staff_directory_company_idx on public.staff_directory(company_id, status);

alter table public.staff_directory enable row level security;
