ALTER TABLE badges DROP CONSTRAINT uq_user_badge;
ALTER TABLE badges ADD CONSTRAINT uq_user_focus_factor UNIQUE (user_id, focus_factor);
