-- Phase 4 (Form Builder) — per-hospital dynamic clinical forms. A template is a
-- named, categorised JSON field list (text/textarea/number/date/select/checkbox);
-- a submission is the filled answers for a patient (validated server-side against
-- the template's own fields). Tenant-scoped; RLS on, service_role BFF only.
create table if not exists public.form_templates (
  id         uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name       text not null,
  category   text not null default 'Umum',
  fields     jsonb not null,
  status     text not null default 'active'
               check (status in ('active', 'archived')),
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists form_templates_company_idx
  on public.form_templates(company_id, status, created_at);

alter table public.form_templates enable row level security;

create table if not exists public.form_submissions (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references public.companies(id) on delete cascade,
  template_id   uuid not null references public.form_templates(id) on delete cascade,
  template_name text not null,
  patient_id    text not null,
  encounter_id  uuid references public.encounters(id) on delete set null,
  answers       jsonb not null,
  submitted_by  uuid references public.users(id) on delete set null,
  created_at    timestamptz not null default now()
);
create index if not exists form_submissions_template_idx
  on public.form_submissions(company_id, template_id, created_at);
create index if not exists form_submissions_patient_idx
  on public.form_submissions(company_id, patient_id, created_at);

alter table public.form_submissions enable row level security;
