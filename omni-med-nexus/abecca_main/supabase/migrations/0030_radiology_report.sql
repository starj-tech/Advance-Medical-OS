-- Phase 4 (RIS) — deepen the radiology side of diagnostic_orders into a reading
-- workflow: the imaging modality (drives per-modality worklists / DICOM MWL) and
-- a structured report (temuan/findings, kesan/impression, saran/recommendation),
-- validated through the existing verified_by/at columns (0029). All additive;
-- RLS already enabled on the base table (0012).
alter table public.diagnostic_orders
  add column if not exists modality              text,  -- X-Ray|CT|MRI|USG|Fluoroskopi|Mammografi
  add column if not exists report_findings       text,
  add column if not exists report_impression     text,
  add column if not exists report_recommendation text;

-- Modality worklist queries filter radiology studies by company + modality + status.
create index if not exists diagnostic_orders_modality_idx
  on public.diagnostic_orders(company_id, modality, status)
  where category = 'radiology';
