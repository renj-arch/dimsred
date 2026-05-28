-- Run this in Supabase SQL Editor (https://supabase.com > SQL Editor)

-- 1. Profiles table
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  name TEXT,
  photo TEXT,
  email TEXT,
  streak_current INT DEFAULT 0,
  streak_longest INT DEFAULT 0,
  streak_last_date TEXT,
  badges JSONB DEFAULT '[]',
  goals JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Results (paper completions)
CREATE TABLE results (
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
CREATE TABLE wrong_answers (
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
CREATE TABLE bookmarks (
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
CREATE TABLE leaderboard (
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

-- Indexes
CREATE INDEX idx_results_user ON results(user_id);
CREATE INDEX idx_results_date ON results(date DESC);
CREATE INDEX idx_wrong_user ON wrong_answers(user_id);
CREATE INDEX idx_bookmarks_user ON bookmarks(user_id);
CREATE INDEX idx_leaderboard_pct ON leaderboard(pct DESC);

-- Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE results ENABLE ROW LEVEL SECURITY;
ALTER TABLE wrong_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard ENABLE ROW LEVEL SECURITY;

-- Policies: users can read/write their own data
CREATE POLICY "profiles_own" ON profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "results_own" ON results FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "wrong_own" ON wrong_answers FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "bookmarks_own" ON bookmarks FOR ALL USING (auth.uid() = user_id);

-- Leaderboard: anyone can read, only own user can insert
CREATE POLICY "leaderboard_select" ON leaderboard FOR SELECT USING (true);
CREATE POLICY "leaderboard_insert" ON leaderboard FOR INSERT WITH CHECK (auth.uid() = user_id);
