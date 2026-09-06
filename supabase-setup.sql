-- Run this in Supabase SQL Editor (https://supabase.com > SQL Editor)

-- 1. Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  name TEXT,
  photo TEXT,
  email TEXT,
  streak_current INT DEFAULT 0,
  streak_longest INT DEFAULT 0,
  streak_last_date TEXT,
  xp INT DEFAULT 0,
  badges JSONB DEFAULT '[]',
  goals JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS xp INT DEFAULT 0;

-- 2. Results (paper completions)
CREATE TABLE IF NOT EXISTS results (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  exam TEXT NOT NULL,
  paper_id TEXT,
  correct INT NOT NULL,
  wrong INT NOT NULL,
  total INT NOT NULL,
  answered INT NOT NULL,
  pct INT NOT NULL,
  time TEXT,
  date TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Wrong answers (spaced repetition)
CREATE TABLE IF NOT EXISTS wrong_answers (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  paper_id TEXT,
  exam TEXT,
  q_num TEXT,
  q_text TEXT,
  correct TEXT,
  chosen TEXT,
  difficulty TEXT,
  section TEXT,
  review_count INT DEFAULT 0,
  next_review TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Bookmarks
CREATE TABLE IF NOT EXISTS bookmarks (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  paper_id TEXT NOT NULL,
  exam TEXT,
  q_num TEXT NOT NULL,
  q_text TEXT,
  section TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, paper_id, q_num)
);

-- 5. Leaderboard (aggregated from results)
CREATE TABLE IF NOT EXISTS leaderboard (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  name TEXT,
  photo TEXT,
  exam TEXT NOT NULL,
  score INT NOT NULL,
  total INT NOT NULL,
  pct INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Quiz progress (per-user resume state for current-affairs quizzes)
CREATE TABLE IF NOT EXISTS quiz_progress (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  payload JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_results_user ON results(user_id);
CREATE INDEX IF NOT EXISTS idx_results_date ON results(date DESC);
CREATE INDEX IF NOT EXISTS idx_wrong_user ON wrong_answers(user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_leaderboard_pct ON leaderboard(pct DESC);

-- Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE results ENABLE ROW LEVEL SECURITY;
ALTER TABLE wrong_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_progress ENABLE ROW LEVEL SECURITY;

-- Policies: users can read/write their own data
DROP POLICY IF EXISTS "profiles_own" ON profiles;
DROP POLICY IF EXISTS "results_own" ON results;
DROP POLICY IF EXISTS "wrong_own" ON wrong_answers;
DROP POLICY IF EXISTS "bookmarks_own" ON bookmarks;
DROP POLICY IF EXISTS "leaderboard_select" ON leaderboard;
DROP POLICY IF EXISTS "leaderboard_insert" ON leaderboard;
DROP POLICY IF EXISTS "quiz_progress_own" ON quiz_progress;

CREATE POLICY "profiles_own" ON profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "results_own" ON results FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "wrong_own" ON wrong_answers FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "bookmarks_own" ON bookmarks FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "quiz_progress_own" ON quiz_progress FOR ALL USING (auth.uid() = id);

CREATE POLICY "leaderboard_select" ON leaderboard FOR SELECT USING (true);
CREATE POLICY "leaderboard_insert" ON leaderboard FOR INSERT WITH CHECK (auth.uid() = user_id);
