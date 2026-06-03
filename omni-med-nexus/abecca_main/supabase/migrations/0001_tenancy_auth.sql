-- Abecca SaaS — Phase 1 tenancy & auth.
--
-- Shared identity for the customer apps (main, it): a company is a tenant, its
-- employees are users, login is Company ID (company_code) + email + password.
-- RLS is enabled with no anon policy (deny-by-default); the server BFF uses the
-- service_role key, which bypasses RLS — matching the other Abecca tables.

create table if not exists public.companies (
  id                     uuid primary key default gen_random_uuid(),
  company_code           text unique not null,              -- the "Company ID" used at login
  legal_name             text not null,
  hospital_class         text,
  npwp                   text,
  address                text,
  phone                  text,
  pic_email              text not null,
  plan                   text not null default 'starter',   -- starter|professional|enterprise
  seats_purchased        integer not null default 1,
  stripe_customer_id     text,
  stripe_subscription_id text,
  status                 text not null default 'trialing',  -- trialing|active|past_due|canceled
  created_at             timestamptz not null default now()
);

create table if not exists public.users (
  id                uuid primary key default gen_random_uuid(),
  company_id        uuid not null references public.companies(id) on delete cascade,
  full_name         text not null,
  email             text not null,
  role_tier         text not null,                          -- executive|manager|doctor|staff
  sub_role          text not null,                          -- slug from lib/rbac.ts
  password_hash     text,                                   -- null until the user sets it (invite flow)
  status            text not null default 'invited',        -- active|invited|disabled
  is_company_admin  boolean not null default false,
  must_set_password boolean not null default true,
  created_at        timestamptz not null default now(),
  unique (company_id, email)
);

create table if not exists public.sessions (
  token_hash  text primary key,                             -- sha256 of the opaque cookie token
  user_id     uuid not null references public.users(id) on delete cascade,
  company_id  uuid not null references public.companies(id) on delete cascade,
  expires_at  timestamptz not null,
  created_at  timestamptz not null default now()
);
create index if not exists sessions_user_idx on public.sessions(user_id);

alter table public.companies enable row level security;
alter table public.users     enable row level security;
alter table public.sessions  enable row level security;
