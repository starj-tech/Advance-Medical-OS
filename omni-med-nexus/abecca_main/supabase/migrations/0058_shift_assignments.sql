-- Phase 5 (SDM, Domain J / WS18) — shift roster (penjadwalan jaga).
-- Each row assigns a named staff member to a shift type on a date in a unit; the app
-- prevents double-booking (one shift per person per day) and rolls up workload hours
-- per staff (lib/rostering). Builds on the staff directory. Tenant-scoped; RLS on.
create table if not exists public.shift_assignments (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  staff_name  text not null,
  unit        text not null,
  shift_type  text not null,
  shift_date  date not null,
  notes       text,
  created_at  timestamptz not null default now()
);
create index if not exists shift_assignments_company_date_idx on public.shift_assignments(company_id, shift_date);

alter table public.shift_assignments enable row level security;
