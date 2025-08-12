-- To revert the migration, we drop all created objects.
-- The order is important to avoid dependency errors.

-- Drop the triggers first
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;
DROP TRIGGER IF EXISTS update_goals_updated_at ON goals;
DROP TRIGGER IF EXISTS update_notes_updated_at ON notes;

-- Drop the function
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Drop the tables
DROP TABLE IF EXISTS notes;
DROP TABLE IF EXISTS goals;
DROP TABLE IF EXISTS entries;
DROP TABLE IF EXISTS tasks;
DROP TABLE IF EXISTS users;

-- Drop the custom ENUM types
DROP TYPE IF EXISTS goal_category;
DROP TYPE IF EXISTS task_category;