-- Create memories_v2 table - PRODUCTION memory system
-- Run this in Supabase SQL Editor to create the memories_v2 table

-- Enable pgvector extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS vector;

-- Create memories_v2 table with vector embeddings
CREATE TABLE IF NOT EXISTS memories_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  conversation_id UUID DEFAULT NULL,
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
CREATE INDEX IF NOT EXISTS memories_v2_user_id_idx ON memories_v2(user_id);
CREATE INDEX IF NOT EXISTS memories_v2_conversation_id_idx ON memories_v2(conversation_id);
CREATE INDEX IF NOT EXISTS memories_v2_created_at_idx ON memories_v2(created_at DESC);
CREATE INDEX IF NOT EXISTS memories_v2_importance_idx ON memories_v2(importance DESC);
CREATE INDEX IF NOT EXISTS memories_v2_type_idx ON memories_v2(memory_type);

-- Create vector similarity index using IVFFlat
-- Lists = 100 is good for up to 1M vectors
CREATE INDEX IF NOT EXISTS memories_v2_embedding_idx ON memories_v2 
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Update function for similarity search to use memories_v2
CREATE OR REPLACE FUNCTION match_memories_v2(
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

-- Function to get memories by type for memories_v2
CREATE OR REPLACE FUNCTION get_memories_by_type_v2(
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
CREATE OR REPLACE FUNCTION update_memories_v2_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER IF NOT EXISTS update_memories_v2_updated_at 
  BEFORE UPDATE ON memories_v2
  FOR EACH ROW EXECUTE FUNCTION update_memories_v2_updated_at();

-- Row Level Security (RLS) - DISABLED for service role access
-- ALTER TABLE memories_v2 ENABLE ROW LEVEL SECURITY;

-- Grant permissions to service role
-- (RLS disabled so service role has full access)

-- Statistics view for admin panel
CREATE OR REPLACE VIEW memory_v2_statistics AS
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

-- Comments for documentation
COMMENT ON TABLE memories_v2 IS 'Production AI memory storage with vector embeddings for semantic search';
COMMENT ON COLUMN memories_v2.embedding IS 'OpenAI text-embedding-ada-002 1536-dimensional vector';
COMMENT ON COLUMN memories_v2.importance IS 'Memory importance: 1-4 low, 5-6 medium, 7-8 high, 9-10 critical';
COMMENT ON COLUMN memories_v2.memory_type IS 'Type of memory: personal info, relationships, preferences, or events';
COMMENT ON COLUMN memories_v2.entities IS 'Extracted entities like names, dates, locations';

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'memories_v2 table created successfully!';
  RAISE NOTICE 'Functions: match_memories_v2, get_memories_by_type_v2';
  RAISE NOTICE 'View: memory_v2_statistics';
  RAISE NOTICE 'RLS: Disabled for service role access';
END $$;