-- TALK2Me Memory System Schema with pgvector
-- This schema implements AI memory storage with semantic search capabilities
-- Requires pgvector extension for vector similarity search

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Drop existing tables if needed (for clean install)
DROP TABLE IF EXISTS memories CASCADE;
DROP FUNCTION IF EXISTS match_memories CASCADE;

-- Create memories table with vector embeddings
CREATE TABLE memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  content TEXT NOT NULL, -- Original content that was remembered
  summary TEXT NOT NULL, -- AI-generated summary of the memory
  embedding VECTOR(1536) NOT NULL, -- OpenAI embeddings dimension
  importance INT DEFAULT 5 CHECK (importance >= 1 AND importance <= 10),
  memory_type TEXT CHECK (memory_type IN ('personal', 'relationship', 'preference', 'event')) NOT NULL,
  entities JSONB DEFAULT '{}', -- Extracted entities (names, dates, etc.)
  metadata JSONB DEFAULT '{}', -- Additional metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX memories_user_id_idx ON memories(user_id);
CREATE INDEX memories_conversation_id_idx ON memories(conversation_id);
CREATE INDEX memories_created_at_idx ON memories(created_at DESC);
CREATE INDEX memories_importance_idx ON memories(importance DESC);
CREATE INDEX memories_type_idx ON memories(memory_type);

-- Create vector similarity index using IVFFlat
-- Lists = 100 is good for up to 1M vectors
CREATE INDEX memories_embedding_idx ON memories 
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Function for similarity search
CREATE OR REPLACE FUNCTION match_memories(
  query_embedding VECTOR(1536),
  match_user_id UUID,
  match_count INT DEFAULT 5,
  match_threshold FLOAT DEFAULT 0.7
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  conversation_id UUID,
  content TEXT,
  summary TEXT,
  importance INT,
  memory_type TEXT,
  entities JSONB,
  similarity FLOAT,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.user_id,
    m.conversation_id,
    m.content,
    m.summary,
    m.importance,
    m.memory_type,
    m.entities,
    1 - (m.embedding <=> query_embedding) AS similarity,
    m.created_at
  FROM memories_v2 m
  WHERE m.user_id = match_user_id
    AND 1 - (m.embedding <=> query_embedding) > match_threshold
  ORDER BY 
    m.importance DESC,
    m.embedding <=> query_embedding ASC
  LIMIT match_count;
END;
$$;

-- Function to get memories by type
CREATE OR REPLACE FUNCTION get_memories_by_type(
  p_user_id UUID,
  p_memory_type TEXT,
  p_limit INT DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  summary TEXT,
  importance INT,
  entities JSONB,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.content,
    m.summary,
    m.importance,
    m.entities,
    m.created_at
  FROM memories_v2 m
  WHERE m.user_id = p_user_id
    AND m.memory_type = p_memory_type
  ORDER BY m.importance DESC, m.created_at DESC
  LIMIT p_limit;
END;
$$;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_memories_updated_at BEFORE UPDATE ON memories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS)
ALTER TABLE memories ENABLE ROW LEVEL SECURITY;

-- Users can only see their own memories
CREATE POLICY "Users can view own memories" ON memories
  FOR SELECT USING (auth.uid() = user_id);

-- Users can only insert their own memories
CREATE POLICY "Users can insert own memories" ON memories
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can only update their own memories
CREATE POLICY "Users can update own memories" ON memories
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can only delete their own memories
CREATE POLICY "Users can delete own memories" ON memories
  FOR DELETE USING (auth.uid() = user_id);

-- Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON memories TO anon, authenticated;
GRANT EXECUTE ON FUNCTION match_memories TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_memories_by_type TO anon, authenticated;

-- Sample memory entries (for testing)
-- These would be created programmatically, not via SQL
/*
Example memory structure:
{
  "content": "Mój mąż Maciej jest programistą i często pracuje do późna",
  "summary": "Mąż użytkownika ma na imię Maciej, jest programistą",
  "importance": 9,
  "memory_type": "relationship",
  "entities": {
    "people": ["Maciej"],
    "relationships": ["mąż"],
    "professions": ["programista"]
  }
}
*/

-- Migration helper to analyze existing chat_history for important memories
CREATE OR REPLACE FUNCTION analyze_chat_history_for_memories(
  p_user_id UUID,
  p_limit INT DEFAULT 100
)
RETURNS TABLE (
  message TEXT,
  response TEXT,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ch.message,
    ch.response,
    ch.created_at
  FROM chat_history ch
  WHERE ch.user_id = p_user_id
  ORDER BY ch.created_at DESC
  LIMIT p_limit;
END;
$$;

-- Statistics view for admin panel
CREATE OR REPLACE VIEW memory_statistics AS
SELECT 
  user_id,
  COUNT(*) as total_memories,
  COUNT(DISTINCT conversation_id) as conversations_with_memories,
  AVG(importance)::NUMERIC(3,1) as avg_importance,
  COUNT(*) FILTER (WHERE memory_type = 'personal') as personal_count,
  COUNT(*) FILTER (WHERE memory_type = 'relationship') as relationship_count,
  COUNT(*) FILTER (WHERE memory_type = 'preference') as preference_count,
  COUNT(*) FILTER (WHERE memory_type = 'event') as event_count,
  MAX(created_at) as last_memory_at
FROM memories_v2
GROUP BY user_id;

-- Grant access to statistics view
GRANT SELECT ON memory_statistics TO authenticated;

COMMENT ON TABLE memories IS 'Stores AI-extracted memories with vector embeddings for semantic search';
COMMENT ON COLUMN memories.embedding IS 'OpenAI text-embedding-ada-002 1536-dimensional vector';
COMMENT ON COLUMN memories.importance IS 'Memory importance: 1-4 low, 5-6 medium, 7-8 high, 9-10 critical';
COMMENT ON COLUMN memories.memory_type IS 'Type of memory: personal info, relationships, preferences, or events';
COMMENT ON COLUMN memories.entities IS 'Extracted entities like names, dates, locations';