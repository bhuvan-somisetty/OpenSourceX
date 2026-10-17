-- Ask chat history, per session user (guest or development until real sign-in exists).
-- `engine` records which engine wrote an assistant message (gateway, anthropic, openai, offline),
-- so daily AI caps can be counted without a separate usage table.
CREATE TABLE ask_conversation (
  id text PRIMARY KEY CHECK (id ~ '^[0-9a-f-]{36}$'),
  user_id text NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (length(title) BETWEEN 1 AND 120),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ask_conversation_user_updated ON ask_conversation (user_id, updated_at DESC);

CREATE TABLE ask_message (
  id bigserial PRIMARY KEY,
  conversation_id text NOT NULL REFERENCES ask_conversation(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user','assistant')),
  content text NOT NULL CHECK (length(content) <= 20000),
  engine text CHECK (engine IN ('gateway','anthropic','openai','offline')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ask_message_conversation ON ask_message (conversation_id, id);
CREATE INDEX ask_message_ai_day ON ask_message (created_at) WHERE engine IS NOT NULL AND engine <> 'offline';
