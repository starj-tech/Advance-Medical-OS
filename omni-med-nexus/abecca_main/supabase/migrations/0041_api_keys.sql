-- Phase 5 (public API) — per-tenant API keys for Bearer-authenticated access to
-- the public REST API (/api/public/v1). Only the sha256 hash of the key and a
-- display prefix are stored; the plaintext is shown once at creation. Revocation
-- is a soft delete (revoked_at). Tenant-scoped; RLS on, service_role BFF only.
create table if not exists public.api_keys (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references public.companies(id) on delete cascade,
  label        text not null,
  key_prefix   text not null,
  key_hash     text not null,
  created_by   uuid references public.users(id) on delete set null,
  created_at   timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at   timestamptz
);
create unique index if not exists api_keys_hash_idx on public.api_keys(key_hash);
create index if not exists api_keys_company_idx on public.api_keys(company_id, created_at desc);

alter table public.api_keys enable row level security;
