CREATE TABLE IF NOT EXISTS personas (
  id             SERIAL PRIMARY KEY,
  name           TEXT NOT NULL,
  traits         JSONB NOT NULL DEFAULT '[]',
  speaking_style TEXT NOT NULL DEFAULT '',
  backstory      TEXT NOT NULL DEFAULT '',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS conversations (
  id         SERIAL PRIMARY KEY,
  persona_id INTEGER NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS messages (
  id              SERIAL PRIMARY KEY,
  conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role            TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content         TEXT NOT NULL,
  latency_ms      INTEGER,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS consistency_runs (
  id             SERIAL PRIMARY KEY,
  persona_id     INTEGER NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
  probe          TEXT NOT NULL,
  score          DOUBLE PRECISION NOT NULL,
  agreement      DOUBLE PRECISION NOT NULL,
  trait_coverage DOUBLE PRECISION NOT NULL,
  responses      JSONB NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conversations_persona ON conversations(persona_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_runs_persona ON consistency_runs(persona_id);
