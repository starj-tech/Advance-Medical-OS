-- Fluid balance / intake–output charting (Domain E): one row per measured volume in/out for a
-- patient. The running balance (intake − output) is derived in app from these rows. Tenant-scoped;
-- RLS on (app-layer isolation by company_id, service_role bypass).

create table if not exists public.fluid_balance_entries (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  patient_id text not null,
  patient_name text not null,
  direction text not null,             -- intake | output
  type text not null,                  -- oral|iv|transfusion|enteral · urine|vomit|drain|feces|bleeding
  volume_ml integer not null,
  note text,
  recorded_by uuid references public.users(id),
  recorded_at timestamptz not null default now()
);

create index if not exists fluid_balance_company_idx on public.fluid_balance_entries (company_id, recorded_at desc);
create index if not exists fluid_balance_patient_idx on public.fluid_balance_entries (company_id, patient_id);

alter table public.fluid_balance_entries enable row level security;
