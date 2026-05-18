-- USM Database Schema
-- SQLite with WAL mode for performance

PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  active_provider TEXT NOT NULL,
  active_model TEXT NOT NULL,
  total_tokens INTEGER DEFAULT 0
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  token_count INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

-- Model switches log
CREATE TABLE IF NOT EXISTS model_switches (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  from_provider TEXT,
  from_model TEXT,
  to_provider TEXT NOT NULL,
  to_model TEXT NOT NULL,
  tokens_at_switch INTEGER,
  switched_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

-- Provider API keys (stored locally only)
CREATE TABLE IF NOT EXISTS provider_keys (
  provider TEXT PRIMARY KEY,
  api_key TEXT NOT NULL,
  added_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_switches_session ON model_switches(session_id);
