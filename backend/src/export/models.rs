// backend/src/export/models.rs
use crate::analytics::models::EarnedBadge;
use crate::entries::models::Entry;
use crate::goals::models::Goal;
use crate::notes::models::Note;
use crate::tasks::models::Task;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Represents a complete archive of a user's data for JSON export.
/// This struct composes models from all other modules.
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UserDataExport {
    pub export_metadata: ExportMetadata,
    pub tasks: Vec<Task>,
    pub entries: Vec<Entry>,
    pub goals: Vec<Goal>,
    pub notes: Vec<Note>,
    pub badges: Vec<EarnedBadge>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportMetadata {
    pub user_id: Uuid,
    pub export_date: DateTime<Utc>,
    pub version: String,
}