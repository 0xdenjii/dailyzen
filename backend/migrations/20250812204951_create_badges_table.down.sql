-- backend/migrations/YYYYMMDDHHMMSS_create_badges_table.down.sql

-- Drop the table first
DROP TABLE IF EXISTS badges;

-- Then drop the custom ENUM types
DROP TYPE IF EXISTS badge_material_tier;
DROP TYPE IF EXISTS badge_rank_tier;
DROP TYPE IF EXISTS badge_focus_factor;