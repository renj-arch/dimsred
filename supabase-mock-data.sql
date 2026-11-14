-- Run this in Supabase SQL Editor (New Query)
-- Drops FK constraint, clears leaderboard, inserts 3 mock users.

ALTER TABLE leaderboard DROP CONSTRAINT IF EXISTS leaderboard_user_id_fkey;
DELETE FROM leaderboard;

INSERT INTO leaderboard (user_id, name, photo, exam, score, total, pct, created_at) VALUES
('00000000-0000-0000-0000-000000000001', 'Arun Sharma', 'https://api.dicebear.com/7.x/avataaars/svg?seed=arun', 'SSC CGL', 92, 100, 92, '2026-05-28T10:00:00Z'),
('00000000-0000-0000-0000-000000000002', 'Priya Verma', 'https://api.dicebear.com/7.x/avataaars/svg?seed=priya', 'NEET', 680, 720, 94, '2026-05-27T14:30:00Z'),
('00000000-0000-0000-0000-000000000003', 'Rahul Singh', 'https://api.dicebear.com/7.x/avataaars/svg?seed=rahul', 'GATE', 72, 100, 72, '2026-05-26T09:15:00Z');

SELECT count(*) as entries FROM leaderboard;
