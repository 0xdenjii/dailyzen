-- backend/migrations/YYYYMMDDHHMMSS_create_badges_table.up.sql

-- ENUM for Material Tiers - Determines the "metal" of the badge
CREATE TYPE badge_material_tier AS ENUM (
    'Coal', 'Iron', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'
);

-- ENUM for Rank Tiers - Determines the "prestige" of the badge
CREATE TYPE badge_rank_tier AS ENUM (
    'Mortal', 'Aspirant', 'Demigod', 'God', 'Titan'
);

-- ENUM for Focus Factors - Determines what the badge celebrates
CREATE TYPE badge_focus_factor AS ENUM (
    'Consistency', -- For streaks
    'Volume',      -- For total points accumulated
    'Mental',      -- For focus on mental tasks
    'Physical',    -- For focus on physical tasks
    'Dedication',  -- For writing notes
    'Ambition'     -- For completing goals
);

-- Table: badges
-- Stores the specific, algorithmically-awarded badges for each user.
CREATE TABLE badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    material_tier badge_material_tier NOT NULL,
    rank_tier badge_rank_tier NOT NULL,
    focus_factor badge_focus_factor NOT NULL,
    threshold INT NOT NULL, -- The value achieved to earn this badge (e.g., 7 for a 7-day streak)
    unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- A user can only have one of each specific badge combination
    CONSTRAINT uq_user_badge UNIQUE (user_id, material_tier, rank_tier, focus_factor)
);

CREATE INDEX idx_badges_user_id ON badges(user_id);
