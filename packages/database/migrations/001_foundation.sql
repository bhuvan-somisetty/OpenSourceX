-- Foundation: sources, snapshots, provenance, sync runs (docs/DATA_MODEL.md section 6).
-- Contact data (email, LFID, phone) must never be stored: no such column may exist.

CREATE TYPE provenance_status AS ENUM
  ('CONFIRMED','HISTORICAL','INFERRED','FORECAST','UNKNOWN','CONFLICTING');
CREATE TYPE confidence_level AS ENUM ('high','medium','low','none');
CREATE TYPE ingestion_status AS ENUM ('approved','pending','blocked');

CREATE TABLE source_provider (
  id bigserial PRIMARY KEY,
  key text NOT NULL UNIQUE,
  name text NOT NULL,
  tier smallint NOT NULL CHECK (tier BETWEEN 1 AND 5),
  program_key text,
  ecosystem_key text,
  coverage text NOT NULL CHECK (coverage IN ('full','ecosystem','partial')),
  base_url text NOT NULL,
  licence_note text,
  terms_status text NOT NULL DEFAULT 'unreviewed',
  robots_status text NOT NULL DEFAULT 'unreviewed',
  ingestion_status ingestion_status NOT NULL DEFAULT 'pending'
);

CREATE TABLE source_dataset (
  id bigserial PRIMARY KEY,
  provider_id bigint NOT NULL REFERENCES source_provider(id),
  key text NOT NULL UNIQUE,
  description text,
  parser_version text NOT NULL
);

-- Only sanitized projections are stored. Raw bodies of files that can carry contact data are never persisted.
CREATE TABLE source_snapshot (
  id bigserial PRIMARY KEY,
  dataset_id bigint NOT NULL REFERENCES source_dataset(id),
  url text NOT NULL,
  fetched_at timestamptz NOT NULL,
  content_hash text NOT NULL,
  schema_version text NOT NULL,
  sanitized_body jsonb NOT NULL,
  origin text NOT NULL CHECK (origin IN ('recorded','live')),
  UNIQUE (dataset_id, content_hash)
);

CREATE TABLE provenance_record (
  id bigserial PRIMARY KEY,
  snapshot_id bigint NOT NULL REFERENCES source_snapshot(id),
  source_url text NOT NULL,
  source_type text NOT NULL,
  publisher text NOT NULL,
  observed_at timestamptz NOT NULL,
  published_at timestamptz,
  last_verified_at timestamptz NOT NULL,
  valid_from timestamptz,
  valid_until timestamptz,
  status provenance_status NOT NULL,
  confidence confidence_level NOT NULL,
  confidence_reason text NOT NULL,
  derivation text NOT NULL CHECK (derivation IN ('direct','rule','model')),
  rule_id text
);

CREATE TABLE sync_run (
  id bigserial PRIMARY KEY,
  dataset_id bigint REFERENCES source_dataset(id),
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  status text NOT NULL,
  counts jsonb NOT NULL DEFAULT '{}',
  error text
);
