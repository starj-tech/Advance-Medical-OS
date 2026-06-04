-- Phase 0 — in-app notification feed (multi-channel center persists here).
-- Tenant + user scoped; RLS on, no anon policy (service_role BFF).
create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  user_id     uuid not null references public.users(id) on delete cascade,
  title       text not null,
  body        text not null,
  type        text not null default 'info',   -- info|clinical|billing|system
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists notifications_user_idx
  on public.notifications(company_id, user_id, created_at desc);

alter table public.notifications enable row level security;
