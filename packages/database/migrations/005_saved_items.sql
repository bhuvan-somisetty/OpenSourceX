-- Users and saved items. Auth-ready: app_user.kind is 'development' until real authentication is connected.
-- A development user is NOT an authenticated identity; it exists so saves persist in local builds.
CREATE TABLE app_user (
  id text PRIMARY KEY,
  display_name text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('development','oauth')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE saved_item (
  id bigserial PRIMARY KEY,
  user_id text NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  entity_type text NOT NULL CHECK (entity_type IN ('PROJECT','REPOSITORY','ORGANIZATION')),
  entity_id text NOT NULL CHECK (length(entity_id) BETWEEN 1 AND 300),
  program_slug text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, entity_type, entity_id)
);
CREATE INDEX saved_item_user_created ON saved_item (user_id, created_at DESC);
