ALTER TABLE badges DROP CONSTRAINT uq_user_focus_factor;
ALTER TABLE badges ADD CONSTRAINT uq_user_badge UNIQUE (user_id, material_tier, rank_tier, focus_factor);
