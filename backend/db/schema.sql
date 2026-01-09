-- Financial Document Analyzer - Database Schema
-- PostgreSQL with pgvector extension
-- Version: 001 (Initial schema)

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- Schema Migrations Table (Track applied migrations)
-- =============================================================================
CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(14) PRIMARY KEY,  -- YYYYMMDDHHMMSS format
    name VARCHAR(255) NOT NULL,
    applied_at TIMESTAMP DEFAULT NOW()
);

-- =============================================================================
-- Transactions Table (Core Data - Multi-Source Compatible)
-- =============================================================================
-- Supports: Upwork, Nu Bank (Credit/Debit), BBVA (Credit/Debit)
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,

    -- Core fields (normalized from all sources)
    date DATE NOT NULL,
    description TEXT NOT NULL,
    amount DECIMAL(12,2) NOT NULL,        -- Positive = income, Negative = expense
    amount_original DECIMAL(12,2),         -- Original amount before normalization
    currency VARCHAR(3) DEFAULT 'USD',     -- USD, MXN

    -- Classification
    category TEXT,                         -- Food, Transport, Income, etc.
    type TEXT CHECK (type IN ('income', 'expense', 'transfer')),

    -- Source tracking
    source_bank VARCHAR(50),               -- upwork, nu_credit, nu_debit, bbva_credit, bbva_debit
    source_file TEXT,                      -- Original filename

    -- Original fields preserved (for debugging/audit)
    original_data JSONB,                   -- Store all original CSV columns

    -- RAG/Embedding
    embedding vector(1536),                -- OpenAI text-embedding-3-small dimension

    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for vector similarity search (requires >= 100 rows to build)
-- Will be created after data is loaded
-- CREATE INDEX IF NOT EXISTS idx_transactions_embedding
-- ON transactions USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_source ON transactions(source_bank);
CREATE INDEX IF NOT EXISTS idx_transactions_amount ON transactions(amount);

-- Composite index for date range + category queries
CREATE INDEX IF NOT EXISTS idx_transactions_date_category ON transactions(date, category);

-- =============================================================================
-- Chat Sessions Table (Conversation Memory)
-- =============================================================================
CREATE TABLE IF NOT EXISTS chat_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT,                      -- First message or summary
    message_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Migration: Add title and message_count columns if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_sessions' AND column_name = 'title') THEN
        ALTER TABLE chat_sessions ADD COLUMN title TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_sessions' AND column_name = 'message_count') THEN
        ALTER TABLE chat_sessions ADD COLUMN message_count INTEGER DEFAULT 0;
    END IF;
END $$;

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
