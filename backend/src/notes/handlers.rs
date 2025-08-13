// backend/src/notes/handlers.rs
use crate::auth::AuthUser;
use crate::errors::AppError;
use crate::notes::models::{DateQuery, Note, UpsertNote};
use crate::state::AppState;
use axum::{
    extract::{Query, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use validator::Validate;

/// Handles creating a new note or updating an existing one for a given day.
pub async fn upsert_note_handler(
    State(state): State<AppState>,
    AuthUser(user_id): AuthUser,
    Json(payload): Json<UpsertNote>,
) -> Result<impl IntoResponse, AppError> {
    payload.validate()?;

    // This single SQL statement handles both INSERT and UPDATE atomically.
    // `ON CONFLICT(user_id, date)` targets the unique constraint on the table.
    // `DO UPDATE` specifies what to do if a note for that user/date already exists.
    // `EXCLUDED` refers to the values that were proposed for insertion.
    let note: Note = sqlx::query_as(
        r#"
        INSERT INTO notes (user_id, date, content, mood)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (user_id, date) DO UPDATE
        SET content = EXCLUDED.content, mood = EXCLUDED.mood
        RETURNING *
        "#,
    )
    .bind(user_id)
    .bind(payload.date)
    .bind(payload.content)
    .bind(payload.mood)
    .fetch_one(&state.db_pool)
    .await?;

    Ok((StatusCode::OK, Json(note)))
}

/// Fetches the note for a specific user and date.
pub async fn get_note_handler(
    State(state): State<AppState>,
    AuthUser(user_id): AuthUser,
    Query(query): Query<DateQuery>,
) -> Result<impl IntoResponse, AppError> {
    // `fetch_optional` is perfect here, as a note may not exist for every day.
    let note: Option<Note> = sqlx::query_as(
        "SELECT * FROM notes WHERE user_id = $1 AND date = $2"
    )
    .bind(user_id)
    .bind(query.date)
    .fetch_optional(&state.db_pool)
    .await?;

    // `Json(note)` will correctly serialize to the note object or `null`.
    Ok((StatusCode::OK, Json(note)))
}

/// Fetches the 7 most recent notes for a user to display in the sidebar.
pub async fn get_recent_notes_handler(
    State(state): State<AppState>,
    AuthUser(user_id): AuthUser,
) -> Result<impl IntoResponse, AppError> {
    let recent_notes: Vec<Note> = sqlx::query_as(
        "SELECT * FROM notes WHERE user_id = $1 ORDER BY date DESC LIMIT 7"
    )
    .bind(user_id)
    .fetch_all(&state.db_pool)
    .await?;

    Ok(Json(recent_notes))
}
