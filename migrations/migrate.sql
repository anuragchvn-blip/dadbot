-- DonutDot Bot (@DonutDot_bot) Database Schema
-- PostgreSQL/Supabase version

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  tg_id BIGINT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  age INTEGER NOT NULL,
  location TEXT NOT NULL,
  university TEXT,
  bio TEXT,
  email_verified BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMP,
  banned BOOLEAN DEFAULT FALSE,
  pref_min_age INTEGER DEFAULT 18,
  pref_max_age INTEGER DEFAULT 99,
  pref_location TEXT,
  pref_university_only BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Likes table
CREATE TABLE IF NOT EXISTS likes (
  id SERIAL PRIMARY KEY,
  from_tg_id BIGINT NOT NULL,
  to_tg_id BIGINT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(from_tg_id, to_tg_id)
);

-- Matches table
CREATE TABLE IF NOT EXISTS matches (
  id SERIAL PRIMARY KEY,
  user1_tg_id BIGINT NOT NULL,
  user2_tg_id BIGINT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user1_tg_id, user2_tg_id)
);

-- Passes table (Daily Pass purchases)
CREATE TABLE IF NOT EXISTS passes (
  id SERIAL PRIMARY KEY,
  tg_id BIGINT NOT NULL,
  reference_id TEXT UNIQUE NOT NULL,
  purchased_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP
);

-- Chat sessions table
CREATE TABLE IF NOT EXISTS chat_sessions (
  id SERIAL PRIMARY KEY,
  match_id INTEGER NOT NULL,
  user1_tg_id BIGINT NOT NULL,
  user2_tg_id BIGINT NOT NULL,
  starts_at TIMESTAMP NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Truth or Dare sessions table
CREATE TABLE IF NOT EXISTS td_sessions (
  id SERIAL PRIMARY KEY,
  user1_tg_id BIGINT,
  user2_tg_id BIGINT,
  mode TEXT NOT NULL CHECK(mode IN ('match', 'public')),
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'ended', 'revealed')),
  user1_revealed BOOLEAN DEFAULT FALSE,
  user2_revealed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  ended_at TIMESTAMP
);

-- Truth or Dare messages table
CREATE TABLE IF NOT EXISTS td_messages (
  id SERIAL PRIMARY KEY,
  session_id INTEGER NOT NULL,
  from_tg_id BIGINT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Reports table
CREATE TABLE IF NOT EXISTS reports (
  id SERIAL PRIMARY KEY,
  reporter_tg_id BIGINT NOT NULL,
  reported_tg_id BIGINT NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'resolved', 'dismissed')),
  created_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP
);

-- Email verification tokens table
CREATE TABLE IF NOT EXISTS verification_tokens (
  id SERIAL PRIMARY KEY,
  tg_id BIGINT NOT NULL,
  email TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  verified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_likes_from ON likes(from_tg_id);
CREATE INDEX IF NOT EXISTS idx_likes_to ON likes(to_tg_id);
CREATE INDEX IF NOT EXISTS idx_matches_user1 ON matches(user1_tg_id);
CREATE INDEX IF NOT EXISTS idx_matches_user2 ON matches(user2_tg_id);
CREATE INDEX IF NOT EXISTS idx_passes_tg_id ON passes(tg_id);
CREATE INDEX IF NOT EXISTS idx_passes_expires ON passes(expires_at);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_expires ON chat_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_users_banned ON users(banned);
CREATE INDEX IF NOT EXISTS idx_users_location ON users(location);
CREATE INDEX IF NOT EXISTS idx_verification_tokens_token ON verification_tokens(token);
