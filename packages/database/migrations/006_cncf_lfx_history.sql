-- CNCF LFX Mentorship history (2019 onwards) from the per-term READMEs of github.com/cncf/mentoring.
-- Still no contact data: mentors keep name + GitHub handle only, mentees are not stored at all.

-- Early terms (2019, 2020) predate LFX project UUIDs. Those programs are keyed by a stable source key.
ALTER TABLE mentorship_project ALTER COLUMN lfx_project_uuid DROP NOT NULL;
ALTER TABLE mentorship_project ADD COLUMN source_key text UNIQUE;
ALTER TABLE mentorship_project ADD COLUMN cncf_project_name text;
ALTER TABLE mentorship_project
  ADD CONSTRAINT mentorship_project_identity CHECK (lfx_project_uuid IS NOT NULL OR source_key IS NOT NULL);
CREATE INDEX mentorship_project_cncf_name ON mentorship_project (lower(cncf_project_name));

-- Per-term facts stated by the source README: label, where it lives, and its official timeline.
CREATE TABLE program_term_detail (
  program_term_id bigint PRIMARY KEY REFERENCES program_term(id) ON DELETE CASCADE,
  label text NOT NULL,
  source_url text NOT NULL,
  timeline jsonb NOT NULL DEFAULT '[]',
  -- the README's own work window; program_term keeps its first-seen canonical window
  starts_on date,
  ends_on date,
  provenance_id bigint NOT NULL REFERENCES provenance_record(id)
);
