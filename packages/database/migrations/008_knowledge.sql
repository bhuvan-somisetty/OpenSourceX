-- Open source knowledge base for Ask: curated guides and reference proposals (personal details
-- removed), split into sections and searched with Postgres full-text search (no paid embeddings).
CREATE TABLE knowledge_doc (
  id text PRIMARY KEY CHECK (id ~ '^[a-z0-9-]{3,80}$'),
  kind text NOT NULL CHECK (kind IN ('guide','reference')),
  title text NOT NULL,
  tags text[] NOT NULL DEFAULT '{}',
  sources jsonb NOT NULL DEFAULT '[]',
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE knowledge_chunk (
  id bigserial PRIMARY KEY,
  doc_id text NOT NULL REFERENCES knowledge_doc(id) ON DELETE CASCADE,
  position int NOT NULL,
  heading text NOT NULL,
  content text NOT NULL,
  search tsvector NOT NULL,
  UNIQUE (doc_id, position)
);
CREATE INDEX knowledge_chunk_search ON knowledge_chunk USING gin (search);

-- free AI providers added to Ask (Google Gemini, Groq)
ALTER TABLE ask_message DROP CONSTRAINT ask_message_engine_check;
ALTER TABLE ask_message ADD CONSTRAINT ask_message_engine_check
  CHECK (engine IN ('google','groq','gateway','anthropic','openai','offline'));
