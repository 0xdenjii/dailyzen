use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use validator::Validate;

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct Entry {
    pub id: Uuid,
    pub user_id: Uuid,
    pub task_id: Uuid,
    pub date: NaiveDate, 
    pub points_awarded: i32,
    pub notes: Option<String>,
    pub completed_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GetEntriesResponse {
    pub entries: Vec<Entry>,
    pub total_points: i64, 
}

#[derive(Debug, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
pub struct CreateEntry {
    pub task_id: Uuid,
    #[serde(default)] 
    pub notes: Option<String>,
    pub date: NaiveDate,
}

#[derive(Debug, Deserialize)]
pub struct DateQuery {
    pub date: NaiveDate,
}

#[derive(Debug, Deserialize, Validate)]
pub struct UpdateEntry {
    #[validate(length(max = 500, message = "Note cannot exceed 500 characters"))]
    pub notes: Option<String>,
}