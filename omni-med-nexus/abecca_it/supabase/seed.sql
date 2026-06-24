-- Seed for the Abecca IT operations console, verbatim from src/lib/data.ts.
-- Idempotent: re-running leaves existing rows untouched.

insert into public.services (id, name, kind, status, uptime, latency_ms, detail) values
  ('postgres', 'PostgreSQL 15',       'Datastore',      'operational', 99.98, 4,  'Primary relational store (patients, tariffs, formulary)'),
  ('redis',    'Redis 7',             'Datastore',      'operational', 99.99, 1,  'Cache & session store'),
  ('qdrant',   'Qdrant',              'Datastore',      'degraded',    99.21, 38, 'Vector search — elevated latency on collection rebuild'),
  ('core',     'Core Engine',         'Engine',         'operational', 99.95, 6,  'Rust library: encryption, audit chain, DB pools'),
  ('main',     'abecca_main',         'Web App',        'operational', 100,   52, 'Clinical portal (public)'),
  ('admin',    'abecca_admin',        'Web App',        'operational', 99.97, 48, 'Hospital administration (internal)'),
  ('demo',     'abecca_demo',         'Web App',        'maintenance', 98.4,  0,  'Demo sandbox — nightly reset window'),
  ('it',       'abecca_it',           'Web App',        'operational', 99.99, 41, 'IT operations console (internal)'),
  ('vpc',      'GCP VPC / Cloud SQL', 'Infrastructure', 'operational', 99.99, 12, 'Terraform-managed, asia-southeast1')
on conflict (id) do nothing;

insert into public.incidents (id, title, severity, service, status, opened_at) values
  ('INC-1042', 'Qdrant latency above threshold',      'warning',  'Qdrant',         'monitoring', '2026-05-30T04:10:00Z'),
  ('INC-1041', 'Demo sandbox scheduled maintenance',  'info',     'abecca_demo',    'open',       '2026-05-30T00:00:00Z'),
  ('INC-1038', 'Postgres connection pool saturation', 'critical', 'PostgreSQL 15',  'resolved',   '2026-05-28T19:30:00Z'),
  ('INC-1035', 'Elevated 5xx on clinical portal',     'warning',  'abecca_main',    'resolved',   '2026-05-27T11:15:00Z')
on conflict (id) do nothing;

insert into public.controls (id, name, status, detail) values
  ('aes',     'AES-256-GCM encryption at rest', 'enforced', 'Patient PII sealed in core_engine'),
  ('audit',   'Tamper-evident audit chain',     'enforced', 'SHA-256 hash-linked blocks; integrity verified'),
  ('headers', 'HTTP security headers',          'enforced', 'HSTS, X-Frame-Options, CSP-ready across all web apps'),
  ('key',     'Production key management',      'review',   'Core uses ephemeral key in tests; load from KMS in prod')
on conflict (id) do nothing;
