use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use validator::Validate;

#[derive(Debug, Serialize, Deserialize, Clone, sqlx::Type)]
#[sqlx(type_name = "task_category", rename_all = "PascalCase")]
pub enum TaskCategory {
    Physical,
    Mental,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct Task {
    pub id: Uuid,
    pub user_id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub points: i32,
    pub category: TaskCategory,
    pub is_mandatory: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
pub struct CreateTask {
    #[validate(length(min = 3, message = "Task name must be at least 3 characters long"))]
    pub name: String,
    pub description: Option<String>,
    #[validate(range(min = -100, max = 100, message = "Points must be between -100 and 100"))]
    pub points: i32,
    pub category: TaskCategory,
    pub is_mandatory: bool,
}

#[derive(Debug, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
pub struct UpdateTask {
    #[validate(length(min = 3, message = "Task name must be at least 3 characters long"))]
    pub name: Option<String>,
    pub description: Option<String>,
    #[validate(range(min = -100, max = 100, message = "Points must be between -100 and 100"))]
    pub points: Option<i32>,
    pub category: Option<TaskCategory>,
    pub is_mandatory: Option<bool>,
}