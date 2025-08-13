use crate::auth::AuthUser;
use crate::errors::AppError;
use crate::state::AppState;
use crate::entries::models::{CreateEntry, DateQuery, Entry, GetEntriesResponse, UpdateEntry};
use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use uuid::Uuid;
use validator::Validate;

pub async fn create_entry_handler(
    State(state): State<AppState>,
    AuthUser(user_id): AuthUser,
    Json(payload): Json<CreateEntry>,
) -> Result<impl IntoResponse, AppError> {
    payload.validate()?;

    let mut tx = state.db_pool.begin().await?;

    // 1. Fetch task points and verify ownership
    let task = sqlx::query!("SELECT points FROM tasks WHERE id = $1 AND user_id = $2", payload.task_id, user_id)
        .fetch_optional(&mut *tx)
        .await?
        .ok_or_else(|| AppError::NotFound("Task not found or you do not own it.".to_string()))?;

    // 2. Insert the new entry
    let new_entry: Entry = sqlx::query_as(
        r#"
        INSERT INTO entries (user_id, task_id, date, points_awarded, notes)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
        "#,
    )
    .bind(user_id)
    .bind(payload.task_id)
    .bind(payload.date)
    .bind(task.points)
    .bind(payload.notes)
    .fetch_one(&mut *tx)
    .await?; // We will handle the unique constraint violation in a later step if it's not already done.

    // 3. Atomically update the user's total points and last entry date.
    //    All streak logic is now REMOVED from this handler.
    sqlx::query!(
        r#"
        UPDATE users 
        SET 
            total_points = total_points + $1,
            last_entry_date = $2
        WHERE id = $3
        "#,
        task.points as i64,
        payload.date,
        user_id
    )
    .execute(&mut *tx)
    .await?;

    tx.commit().await?;

    Ok((StatusCode::CREATED, Json(new_entry)))
}

#[derive(serde::Serialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
struct EntryWithDailyTotal {
    id: Uuid,
    user_id: Uuid,
    task_id: Uuid,
    date: chrono::NaiveDate,
    points_awarded: i32,
    notes: Option<String>,
    completed_at: chrono::DateTime<chrono::Utc>,
    total_points_for_day: i64,
}



pub async fn get_entries_handler(
    State(state): State<AppState>,
    AuthUser(user_id): AuthUser,
    Query(query): Query<DateQuery>,
) -> Result<impl IntoResponse, AppError> {
    let results: Vec<EntryWithDailyTotal> = sqlx::query_as(
        r#"
        SELECT 
            id, user_id, task_id, date, points_awarded, notes, completed_at,
            SUM(points_awarded) OVER () AS total_points_for_day
        FROM entries 
        WHERE user_id = $1 AND date = $2 
        ORDER BY completed_at DESC
        "#,
    )
    .bind(user_id)
    .bind(query.date)
    .fetch_all(&state.db_pool)
    .await?;

    // If there are no entries, return an empty response.
    if results.is_empty() {
        return Ok(Json(GetEntriesResponse {
            entries: vec![],
            total_points: 0,
        }));
    }

    // All rows will have the same `total_points_for_day`, so we can take it from the first one.
    let total_points = results.first().map_or(0, |r| r.total_points_for_day);

    // Convert our query results into the final `Entry` model.
    let entries: Vec<Entry> = results
        .into_iter()
        .map(|r| Entry {
            id: r.id,
            user_id: r.user_id,
            task_id: r.task_id,
            date: r.date,
            points_awarded: r.points_awarded,
            notes: r.notes,
            completed_at: r.completed_at,
        })
        .collect();
    
    let response = GetEntriesResponse {
        entries,
        total_points,
    };

    Ok(Json(response))
}



pub async fn delete_entry_handler(
    State(state): State<AppState>,
    AuthUser(user_id): AuthUser,
    Path(entry_id): Path<Uuid>,
) -> Result<impl IntoResponse, AppError> {
    let mut tx = state.db_pool.begin().await?;

    let entry = sqlx::query!("SELECT points_awarded FROM entries WHERE id = $1 AND user_id = $2", entry_id, user_id)
        .fetch_optional(&mut *tx)
        .await?
        .ok_or_else(|| AppError::NotFound("Entry not found or you do not have permission.".to_string()))?;

    sqlx::query!("DELETE FROM entries WHERE id = $1", entry_id)
        .execute(&mut *tx)
        .await?;

    sqlx::query!(
        "UPDATE users SET total_points = total_points - $1 WHERE id = $2",
        entry.points_awarded as i64,
        user_id
    )
    .execute(&mut *tx)
    .await?;

    tx.commit().await?;

    Ok(StatusCode::NO_CONTENT)
}

pub async fn update_entry_handler(
    State(state): State<AppState>,
    AuthUser(user_id): AuthUser,
    Path(entry_id): Path<Uuid>,
    Json(payload): Json<UpdateEntry>,
) -> Result<impl IntoResponse, AppError> {
    payload.validate()?;

    let updated_entry: Entry = sqlx::query_as(
        r#"
        UPDATE entries
        SET notes = $1
        WHERE id = $2 AND user_id = $3
        RETURNING *
        "#,
    )
    .bind(&payload.notes)
    .bind(entry_id)
    .bind(user_id)
    .fetch_optional(&state.db_pool)
    .await?
    .ok_or(AppError::NotFound("Entry not found or you do not have permission to update it.".to_string()))?;

    Ok(Json(updated_entry))
}
