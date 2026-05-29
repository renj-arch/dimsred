-- Run this in Supabase SQL Editor (https://supabase.com > SQL Editor > New Query)
-- This clears existing leaderboard entries and adds realistic mock users.
-- The FK constraint on user_id is dropped since mock data doesn't need real auth users.

-- 1. Drop FK constraint so we can insert mock user_ids
ALTER TABLE leaderboard DROP CONSTRAINT IF EXISTS leaderboard_user_id_fkey;

-- 2. Clear existing entries
DELETE FROM leaderboard;

-- 3. Insert mock entries with realistic names and scores
INSERT INTO leaderboard (user_id, name, photo, exam, score, total, pct, created_at) VALUES
-- SSC CGL entries
('00000000-0000-0000-0000-000000000001', 'Arun Sharma', 'https://api.dicebear.com/7.x/avataaars/svg?seed=arun', 'SSC CGL', 92, 100, 92, '2026-05-28T10:00:00Z'),
('00000000-0000-0000-0000-000000000002', 'Priya Verma', 'https://api.dicebear.com/7.x/avataaars/svg?seed=priya', 'SSC CGL', 88, 100, 88, '2026-05-27T14:30:00Z'),
('00000000-0000-0000-0000-000000000003', 'Rahul Singh', 'https://api.dicebear.com/7.x/avataaars/svg?seed=rahul', 'SSC CGL', 85, 100, 85, '2026-05-26T09:15:00Z'),
('00000000-0000-0000-0000-000000000004', 'Sneha Patel', 'https://api.dicebear.com/7.x/avataaars/svg?seed=sneha', 'SSC CGL', 82, 100, 82, '2026-05-25T16:45:00Z'),
('00000000-0000-0000-0000-000000000005', 'Vikram Joshi', 'https://api.dicebear.com/7.x/avataaars/svg?seed=vikram', 'SSC CGL', 79, 100, 79, '2026-05-24T11:20:00Z'),

-- RBI Grade B entries
('00000000-0000-0000-0000-000000000006', 'Ananya Gupta', 'https://api.dicebear.com/7.x/avataaars/svg?seed=ananya', 'RBI Grade B', 45, 50, 90, '2026-05-28T08:00:00Z'),
('00000000-0000-0000-0000-000000000007', 'Rohit Kumar', 'https://api.dicebear.com/7.x/avataaars/svg?seed=rohit', 'RBI Grade B', 42, 50, 84, '2026-05-27T13:00:00Z'),
('00000000-0000-0000-0000-000000000008', 'Kavita Nair', 'https://api.dicebear.com/7.x/avataaars/svg?seed=kavita', 'RBI Grade B', 40, 50, 80, '2026-05-26T10:30:00Z'),
('00000000-0000-0000-0000-000000000009', 'Amit Deshmukh', 'https://api.dicebear.com/7.x/avataaars/svg?seed=amit', 'RBI Grade B', 38, 50, 76, '2026-05-25T15:10:00Z'),

-- JEE entries
('00000000-0000-0000-0000-000000000010', 'Neha Sharma', 'https://api.dicebear.com/7.x/avataaars/svg?seed=neha', 'JEE', 280, 300, 93, '2026-05-28T07:30:00Z'),
('00000000-0000-0000-0000-000000000011', 'Aditya Iyer', 'https://api.dicebear.com/7.x/avataaars/svg?seed=aditya', 'JEE', 265, 300, 88, '2026-05-27T12:00:00Z'),
('00000000-0000-0000-0000-000000000012', 'Isha Mehta', 'https://api.dicebear.com/7.x/avataaars/svg?seed=isha', 'JEE', 252, 300, 84, '2026-05-26T09:45:00Z'),

-- NEET entries
('00000000-0000-0000-0000-000000000013', 'Riya Kapoor', 'https://api.dicebear.com/7.x/avataaars/svg?seed=riya', 'NEET', 680, 720, 94, '2026-05-28T06:00:00Z'),
('00000000-0000-0000-0000-000000000014', 'Arjun Reddy', 'https://api.dicebear.com/7.x/avataaars/svg?seed=arjun', 'NEET', 650, 720, 90, '2026-05-27T11:15:00Z'),
('00000000-0000-0000-0000-000000000015', 'Pooja Yadav', 'https://api.dicebear.com/7.x/avataaars/svg?seed=pooja', 'NEET', 620, 720, 86, '2026-05-26T14:20:00Z'),

-- GATE entries
('00000000-0000-0000-0000-000000000016', 'Siddharth Bose', 'https://api.dicebear.com/7.x/avataaars/svg?seed=siddharth', 'GATE', 72, 100, 72, '2026-05-28T10:30:00Z'),
('00000000-0000-0000-0000-000000000017', 'Lakshmi Krishnan', 'https://api.dicebear.com/7.x/avataaars/svg?seed=lakshmi', 'GATE', 68, 100, 68, '2026-05-27T08:45:00Z'),
('00000000-0000-0000-0000-000000000018', 'Manoj Tiwari', 'https://api.dicebear.com/7.x/avataaars/svg?seed=manoj', 'GATE', 65, 100, 65, '2026-05-26T13:00:00Z'),
('00000000-0000-0000-0000-000000000019', 'Divya Choudhury', 'https://api.dicebear.com/7.x/avataaars/svg?seed=divya', 'GATE', 61, 100, 61, '2026-05-25T10:10:00Z');

-- Verify
SELECT count(*) as entries FROM leaderboard;
