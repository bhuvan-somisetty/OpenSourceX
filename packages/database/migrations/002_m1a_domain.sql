-- M1a domain tables (docs/DATA_MODEL.md). Typed core entities, real foreign keys, provenance on every claim.
-- Deliberately absent: any email, LFID or phone column (DATA_POLICY.md section 3).
-- Deferred to M1b: project, repository (needs GitHub ids), issue/PR/commit, community_channel.

-- provenance rows are idempotent per snapshot and derivation, so re-runs only refresh last_verified_at.
CREATE UNIQUE INDEX provenance_record_unique
  ON provenance_record (snapshot_id, derivation, (coalesce(rule_id, '')), status, confidence);

CREATE TABLE program (
  id bigserial PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  official_url text NOT NULL
);

-- e.g. LFX Mentorship > CNCF. CNCF is one ecosystem inside LFX, not all of it (D-013).
CREATE TABLE program_ecosystem (
  id bigserial PRIMARY KEY,
  program_id bigint NOT NULL REFERENCES program(id),
  key text NOT NULL,
  name text NOT NULL,
  coverage_note text NOT NULL,
  UNIQUE (program_id, key)
);

CREATE TABLE program_year (
  id bigserial PRIMARY KEY,
  program_id bigint NOT NULL REFERENCES program(id),
  year integer NOT NULL CHECK (year BETWEEN 2000 AND 2100),
  UNIQUE (program_id, year)
);

CREATE TABLE program_term (
  id bigserial PRIMARY KEY,
  program_id bigint NOT NULL REFERENCES program(id),
  year integer NOT NULL,
  term_code text NOT NULL CHECK (term_code IN ('T1','T2','T3')),
  track text NOT NULL DEFAULT 'unspecified' CHECK (track IN ('unspecified','full-time','part-time')),
  starts_on date,
  ends_on date,
  provenance_id bigint NOT NULL REFERENCES provenance_record(id),
  UNIQUE (program_id, year, term_code, track)
);

-- Every distinct raw spelling is kept for audit; it never decides a term on its own.
CREATE TABLE term_alias (
  id bigserial PRIMARY KEY,
  program_id bigint NOT NULL REFERENCES program(id),
  raw_text text NOT NULL,
  term_code text,
  year integer,
  method text NOT NULL,
  confidence confidence_level NOT NULL,
  provenance_id bigint NOT NULL REFERENCES provenance_record(id),
  UNIQUE (program_id, raw_text)
);

CREATE TABLE organization (
  id bigserial PRIMARY KEY,
  name text NOT NULL,
  website_url text,
  source_code_url text,
  license text,
  tagline text,
  provenance_id bigint NOT NULL REFERENCES provenance_record(id)
);

CREATE TABLE external_identifier (
  id bigserial PRIMARY KEY,
  entity_type text NOT NULL,
  entity_id bigint NOT NULL,
  dataset_key text NOT NULL,
  id_type text NOT NULL,
  value text NOT NULL,
  UNIQUE (dataset_key, id_type, value)
);

-- Grain is explicit (D-007). M1a supports only organization/year; GSoC data can never be project-level.
CREATE TABLE participation (
  id bigserial PRIMARY KEY,
  program_year_id bigint NOT NULL REFERENCES program_year(id),
  organization_id bigint NOT NULL REFERENCES organization(id),
  granularity text NOT NULL CHECK (granularity = 'organization_year'),
  status provenance_status NOT NULL,
  provenance_id bigint NOT NULL REFERENCES provenance_record(id),
  UNIQUE (program_year_id, organization_id)
);

-- An LFX "project" is a mentorship offering, not an OpenSourceX Project (ENTITY_RESOLUTION.md).
CREATE TABLE mentorship_project (
  id bigserial PRIMARY KEY,
  lfx_project_uuid uuid NOT NULL UNIQUE,
  title text NOT NULL,
  program_id bigint NOT NULL REFERENCES program(id),
  ecosystem_id bigint REFERENCES program_ecosystem(id),
  raw_repo_link text,
  upstream_key text,
  link_state text NOT NULL CHECK (link_state IN ('INFERRED','ORG_ONLY','UNLINKED')),
  link_reason text NOT NULL,
  cncf_project_slug text,
  cncf_maturity text,
  technologies text[] NOT NULL DEFAULT '{}',
  summary text,
  provenance_id bigint NOT NULL REFERENCES provenance_record(id)
);

CREATE TABLE mentorship_project_term (
  id bigserial PRIMARY KEY,
  mentorship_project_id bigint NOT NULL REFERENCES mentorship_project(id),
  program_term_id bigint REFERENCES program_term(id),
  raw_term_name text NOT NULL,
  norm_status text NOT NULL CHECK (norm_status IN ('CONFIRMED','INFERRED','CONFLICTING','UNKNOWN')),
  norm_confidence confidence_level NOT NULL,
  norm_reason text NOT NULL,
  source_start date,
  source_end date,
  provenance_id bigint NOT NULL REFERENCES provenance_record(id),
  UNIQUE (mentorship_project_id, raw_term_name)
);

-- Public identifiers only: name and GitHub handle. No contact data.
CREATE TABLE person (
  id bigserial PRIMARY KEY,
  display_name text NOT NULL,
  github_login text NOT NULL,
  provenance_id bigint NOT NULL REFERENCES provenance_record(id)
);
CREATE UNIQUE INDEX person_github_login_unique ON person (lower(github_login));

CREATE TABLE person_role (
  id bigserial PRIMARY KEY,
  person_id bigint NOT NULL REFERENCES person(id),
  role text NOT NULL CHECK (role IN ('contributor','reviewer','merger','maintainer','official_mentor')),
  mentorship_project_id bigint NOT NULL REFERENCES mentorship_project(id),
  role_label text,
  status provenance_status NOT NULL,
  provenance_id bigint NOT NULL REFERENCES provenance_record(id),
  UNIQUE (person_id, role, mentorship_project_id)
);

CREATE TABLE entity_link (
  id bigserial PRIMARY KEY,
  left_type text NOT NULL,
  left_id bigint NOT NULL,
  right_type text NOT NULL,
  right_key text NOT NULL,
  state text NOT NULL,
  method text NOT NULL,
  evidence text NOT NULL,
  confidence confidence_level NOT NULL,
  provenance_id bigint NOT NULL REFERENCES provenance_record(id),
  UNIQUE (left_type, left_id, right_type, right_key)
);

-- Append-only history: changed attributes never overwrite the past silently.
CREATE TABLE entity_revision (
  id bigserial PRIMARY KEY,
  entity_type text NOT NULL,
  entity_id bigint NOT NULL,
  changed_fields jsonb NOT NULL,
  provenance_id bigint NOT NULL REFERENCES provenance_record(id),
  observed_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE conflict (
  id bigserial PRIMARY KEY,
  entity_type text NOT NULL,
  entity_id bigint NOT NULL,
  attribute text NOT NULL,
  detail text NOT NULL,
  provenance_a bigint NOT NULL REFERENCES provenance_record(id),
  provenance_b bigint REFERENCES provenance_record(id),
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (entity_type, entity_id, attribute, detail)
);
