-- Phase 2 billing — parked registrations awaiting Stripe payment confirmation.
-- The opaque token travels in the Checkout Session metadata; the webhook reads
-- it back to provision the tenant. RLS on, no anon policy (service_role BFF).

create table if not exists public.pending_registrations (
  token       text primary key,
  plan        text not null,
  payload     jsonb not null,
  created_at  timestamptz not null default now()
);

alter table public.pending_registrations enable row level security;
