-- Interview practice: each finished mock interview with its report, so a signed-in user can open
-- it again on any device, follow their scores over time, tick off the practice plan and share it
-- by link. Holds only what the user typed or said in answers, never contact data.
CREATE TABLE IF NOT EXISTS interview_session (
  user_id text NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  id text NOT NULL CHECK (length(id) BETWEEN 8 AND 80),
  project_name text NOT NULL CHECK (length(project_name) BETWEEN 1 AND 300),
  modes text[] NOT NULL DEFAULT '{}',
  level text NOT NULL CHECK (length(level) <= 20),
  engine text NOT NULL DEFAULT 'offline' CHECK (engine IN ('ai','offline')),
  overall smallint NOT NULL CHECK (overall BETWEEN 0 AND 100),
  -- { project, report, turns }: the report exactly as shown, with any retried answers
  data jsonb NOT NULL CHECK (octet_length(data::text) <= 400000),
  -- practice plan ticks, keyed "<focus>-<action>"
  plan jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- set only while the user shares the report by link
  share_token text UNIQUE CHECK (share_token IS NULL OR length(share_token) BETWEEN 16 AND 64),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, id)
);
CREATE INDEX IF NOT EXISTS interview_session_user_created
  ON interview_session (user_id, created_at DESC);
