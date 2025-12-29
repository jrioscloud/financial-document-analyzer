-- Financial Document Analyzer - Database Schema
-- PostgreSQL with pgvector extension

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- Transactions Table (Core Data)
-- =============================================================================
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    description TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    category TEXT,
    type TEXT CHECK (type IN ('income', 'expense')),
    embedding vector(1536),      -- OpenAI text-embedding-3-small dimension
    source_file TEXT,            -- Track which file this came from
    created_at TIMESTAMP DEFAULT NOW()
);

-- Index for vector similarity search
CREATE INDEX IF NOT EXISTS idx_transactions_embedding
ON transactions USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Index for date range queries
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);

-- Index for category filtering
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category);

-- =============================================================================
-- Chat Sessions Table (Conversation Memory)
-- =============================================================================
CREATE TABLE IF NOT EXISTS chat_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =============================================================================
-- Chat Messages Table (Message History)
-- =============================================================================
CREATE TABLE IF NOT EXISTS chat_messages (
    id SERIAL PRIMARY KEY,
    session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
    role TEXT CHECK (role IN ('user', 'assistant', 'system')) NOT NULL,
    content TEXT NOT NULL,
    tools_used TEXT[],           -- Track which tools were called
    created_at TIMESTAMP DEFAULT NOW()
);

-- Index for fetching messages by session
CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id, created_at);

-- =============================================================================
-- Helper Functions
-- =============================================================================

-- Function to update chat_sessions.updated_at on new message
CREATE OR REPLACE FUNCTION update_session_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE chat_sessions SET updated_at = NOW() WHERE id = NEW.session_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update session timestamp
DROP TRIGGER IF EXISTS trigger_update_session ON chat_messages;
CREATE TRIGGER trigger_update_session
    AFTER INSERT ON chat_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_session_timestamp();
