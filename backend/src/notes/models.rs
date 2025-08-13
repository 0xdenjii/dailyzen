// backend/src/notes/models.rs
use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use validator::Validate;

// The full Note model, matching the 'notes' table and DailyNote frontend type.
#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct Note {
    pub id: Uuid,
    pub user_id: Uuid,
    pub date: NaiveDate,
    pub content: Option<String>,
    #[sqlx(try_from = "i16")] // sqlx needs to know how to convert SMALLINT
    pub mood: Option<i16>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize, Validate)]
pub struct UpsertNote {
    #[validate(length(min = 1, message = "Content cannot be empty if provided"))]
    pub content: String,
    #[validate(range(min = 1, max = 5, message = "Mood must be between 1 and 5"))]
    pub mood: Option<i16>,
    pub date: NaiveDate,
}

#[derive(Debug, Deserialize)]
pub struct DateQuery {
    pub date: NaiveDate,
}