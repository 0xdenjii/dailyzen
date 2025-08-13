// backend/src/goals/models.rs
use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use validator::Validate;

// Custom ENUM to match PostgreSQL's 'goal_category' and the frontend type
#[derive(Debug, Serialize, Deserialize, Clone, sqlx::Type)]
#[sqlx(type_name = "goal_category", rename_all = "PascalCase")]
pub enum GoalCategory {
    Physical,
    Mental,
    Career,
    Personal,
    Financial,
}

// The full Goal model, matching the 'goals' table and frontend's Goal type
#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct Goal {
    pub id: Uuid,
    pub user_id: Uuid,
    pub description: String,
    pub category: GoalCategory,
    pub deadline: NaiveDate,
    pub penalty: i32,
    pub progress: i16, // Matches SMALLINT
    pub is_completed: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

// Payload for creating a new goal, matching GoalFormData
#[derive(Debug, Deserialize, Validate)]
pub struct CreateGoal {
    #[validate(length(min = 5, message = "Description must be at least 5 characters long"))]
    pub description: String,
    pub category: GoalCategory,
    pub deadline: NaiveDate,
    #[validate(range(min = 0, message = "Penalty cannot be negative"))]
    pub penalty: i32,
}

// Payload for updating an existing goal. All fields are optional.
#[derive(Debug, Deserialize, Validate)]
pub struct UpdateGoal {
    #[validate(length(min = 5, message = "Description must be at least 5 characters long"))]
    pub description: Option<String>,
    pub category: Option<GoalCategory>,
    pub deadline: Option<NaiveDate>,
    #[validate(range(min = 0, message = "Penalty cannot be negative"))]
    pub penalty: Option<i32>,
    #[validate(range(min = 0, max = 100, message = "Progress must be between 0 and 100"))]
    pub progress: Option<i16>,
}