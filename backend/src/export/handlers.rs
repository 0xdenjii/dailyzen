// backend/src/export/handlers.rs
use crate::auth::AuthUser;
use crate::errors::AppError;
use crate::export::models::{ExportMetadata, UserDataExport};
use crate::state::AppState;
use axum::{
    extract::State,
    http::{header, HeaderMap, StatusCode},
    response::IntoResponse,
    Json,
};
use futures::try_join;

pub async fn export_data_handler(
    State(state): State<AppState>,
    AuthUser(user_id): AuthUser,
) -> Result<impl IntoResponse, AppError> {
    // Fetch all user data concurrently for maximum efficiency.
    let tasks_future = sqlx::query_as("SELECT * FROM tasks WHERE user_id = $1 ORDER BY created_at").bind(user_id).fetch_all(&state.db_pool);
    let entries_future = sqlx::query_as("SELECT * FROM entries WHERE user_id = $1 ORDER BY date").bind(user_id).fetch_all(&state.db_pool);
    let goals_future = sqlx::query_as("SELECT * FROM goals WHERE user_id = $1 ORDER BY created_at").bind(user_id).fetch_all(&state.db_pool);
    let notes_future = sqlx::query_as("SELECT * FROM notes WHERE user_id = $1 ORDER BY date").bind(user_id).fetch_all(&state.db_pool);
    let badges_future = sqlx::query_as("SELECT * FROM badges WHERE user_id = $1 ORDER BY unlocked_at").bind(user_id).fetch_all(&state.db_pool);

    // Await all futures in parallel. If any query fails, the whole operation fails.
    let (tasks, entries, goals, notes, badges) = try_join!(
        tasks_future,
        entries_future,
        goals_future,
        notes_future,
        badges_future
    )?;

    let export_data = UserDataExport {
        export_metadata: ExportMetadata {
            user_id,
            export_date: chrono::Utc::now(),
            version: "1.0.0".to_string(), // App version
        },
        tasks,
        entries,
        goals,
        notes,
        badges,
    };

    // Set headers to prompt the browser to download the file.
    let mut headers = HeaderMap::new();
    let filename = format!("dailyzen_export_{}.json", chrono::Utc::now().format("%Y-%m-%d"));
    headers.insert(
        header::CONTENT_DISPOSITION,
        format!("attachment; filename=\"{}\"", filename).parse().unwrap(),
    );

    Ok((StatusCode::OK, headers, Json(export_data)))
}