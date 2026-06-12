-- Phase 4 (LIS) — deepen diagnostic_orders into a lab workflow: specimen
-- tracking (accession + collected_by/at), a graded result_flag (normal /
-- abnormal / critical panic value), and two-step validation (verified_by/at).
-- All columns are additive; RLS already enabled on the base table (0012).
alter table public.diagnostic_orders
  add column if not exists accession    text,
  add column if not exists collected_by uuid references public.users(id) on delete set null,
  add column if not exists collected_at timestamptz,
  add column if not exists result_flag  text,            -- normal|abnormal|critical|unknown
  add column if not exists verified_by  uuid references public.users(id) on delete set null,
  add column if not exists verified_at  timestamptz;

-- Worklist queries filter by company + status, ordered by placement time.
create index if not exists diagnostic_orders_worklist_idx
  on public.diagnostic_orders(company_id, status, ordered_at);
