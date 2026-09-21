-- Discovery filters need the recorded tags (technology, topic, category) of GSoC organizations.
CREATE TABLE organization_tag (
  organization_id bigint NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('tech','topic','category')),
  value text NOT NULL,
  PRIMARY KEY (organization_id, kind, value)
);
