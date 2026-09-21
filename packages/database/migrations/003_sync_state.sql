-- M1b preparation: sync state, source-version tracking, quarantine, freshness policy.
-- No contact data may be stored here either: quarantine keeps hashes and reasons, never payloads.

CREATE TABLE sync_state (
  dataset_id bigint PRIMARY KEY REFERENCES source_dataset(id),
  cursor text,
  last_attempt_at timestamptz,
  last_success_at timestamptz,
  consecutive_failures integer NOT NULL DEFAULT 0,
  circuit_open_until timestamptz,
  source_shape_hash text,
  parser_version text
);

-- A batch whose structure differs from the last good one is held here, not persisted.
CREATE TABLE quarantine (
  id bigserial PRIMARY KEY,
  dataset_id bigint NOT NULL REFERENCES source_dataset(id),
  reason text NOT NULL,
  expected_shape_hash text,
  observed_shape_hash text NOT NULL,
  snapshot_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  UNIQUE (dataset_id, observed_shape_hash, snapshot_hash)
);

CREATE TABLE freshness_policy (
  dataset_key text PRIMARY KEY REFERENCES source_dataset(key),
  max_age_days integer NOT NULL CHECK (max_age_days > 0)
);

-- STALE is derived at read time from last_verified_at and the policy; it is never stored.
CREATE VIEW provenance_freshness AS
SELECT pr.id AS provenance_id,
       d.key AS dataset_key,
       pr.last_verified_at,
       fp.max_age_days,
       CASE WHEN now() - pr.last_verified_at > make_interval(days => fp.max_age_days)
            THEN 'stale' ELSE 'fresh' END AS freshness
FROM provenance_record pr
JOIN source_snapshot s ON s.id = pr.snapshot_id
JOIN source_dataset d ON d.id = s.dataset_id
JOIN freshness_policy fp ON fp.dataset_key = d.key;
