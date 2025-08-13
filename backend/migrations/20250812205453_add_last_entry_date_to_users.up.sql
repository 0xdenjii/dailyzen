
ALTER TABLE users
ADD COLUMN last_entry_date DATE; -- NULLABLE, as new users won't have an entry date yet

-- Optional: Add an index for the cron job, which will be very efficient
CREATE INDEX idx_users_last_entry_date ON users(last_entry_date);