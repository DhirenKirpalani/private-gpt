-- ════════════════════════════════════════════════════════════════
-- AI MEMORY SYSTEM — Industry Standard Architecture
-- ════════════════════════════════════════════════════════════════
--
-- Short-term memory: `chat_messages` table (already exists)
--   - Conversation-scoped, ephemeral context window
--   - Cleared when conversation ends or context window fills
--   - Provides full message history within a single conversation
--
-- Long-term memory: `ai_long_term_memories` table (below)
--   - Cross-conversation, persistent storage
--   - Extracted facts, preferences, contacts, decisions
--   - Semantically deduplicated to avoid redundancy
--   - Injected into system prompt for all new conversations
--
-- Reference: Mem0, LangChain Memory, OpenAI Memory architecture
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS ai_long_term_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  conversation_id UUID,
  content TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  importance SMALLINT NOT NULL DEFAULT 5,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_accessed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Categories: 'preference' | 'contact' | 'fact' | 'decision' | 'instruction' | 'general'
-- Importance: 1-10 (10 = critical, 1 = trivial)

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ai_ltm_user_id ON ai_long_term_memories(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_ltm_user_active ON ai_long_term_memories(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_ai_ltm_user_category ON ai_long_term_memories(user_id, category);
CREATE INDEX IF NOT EXISTS idx_ai_ltm_user_content ON ai_long_term_memories(user_id, content);
CREATE INDEX IF NOT EXISTS idx_ai_ltm_last_accessed ON ai_long_term_memories(last_accessed_at);

-- Enable RLS
ALTER TABLE ai_long_term_memories ENABLE ROW LEVEL SECURITY;

-- Service role has full access (used by API routes)
CREATE POLICY "Service role full access to long-term memories"
  ON ai_long_term_memories FOR ALL
  USING (true);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_ai_ltm_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ai_ltm_updated_at ON ai_long_term_memories;
CREATE TRIGGER trg_ai_ltm_updated_at
  BEFORE UPDATE ON ai_long_term_memories
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_ltm_updated_at();
