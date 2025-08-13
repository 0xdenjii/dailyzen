use crate::auth::AuthUser;
use crate::errors::AppError;
use crate::state::AppState;
use crate::tasks::models::{CreateTask, Task, UpdateTask};
use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use sqlx::QueryBuilder;
use uuid::Uuid;
use validator::Validate;

pub async fn create_task_handler(
    State(state): State<AppState>,
    AuthUser(user_id): AuthUser,
    Json(payload): Json<CreateTask>,
) -> Result<impl IntoResponse, AppError> {
    payload.validate()?;

    let new_task: Task = sqlx::query_as(
        r#"
        INSERT INTO tasks (user_id, name, description, points, category, is_mandatory)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
        "#,
    )
    .bind(user_id)
    .bind(payload.name)
    .bind(payload.description)
    .bind(payload.points)
    .bind(payload.category)
    .bind(payload.is_mandatory)
    .fetch_one(&state.db_pool)
    .await?;

    Ok((StatusCode::CREATED, Json(new_task)))
}

pub async fn get_tasks_handler(
    State(state): State<AppState>,
    AuthUser(user_id): AuthUser,
) -> Result<impl IntoResponse, AppError> {
    let tasks: Vec<Task> = sqlx::query_as("SELECT * FROM tasks WHERE user_id = $1 ORDER BY created_at DESC")
        .bind(user_id)
        .fetch_all(&state.db_pool)
        .await?;

    Ok(Json(tasks))
}

pub async fn update_task_handler(
    State(state): State<AppState>,
    AuthUser(user_id): AuthUser,
    Path(task_id): Path<Uuid>,
    Json(payload): Json<UpdateTask>,
) -> Result<impl IntoResponse, AppError> {
    payload.validate()?;

    // First, ensure the task exists and belongs to the user. This is correct.
    sqlx::query("SELECT id FROM tasks WHERE id = $1 AND user_id = $2")
        .bind(task_id)
        .bind(user_id)
        .fetch_optional(&state.db_pool)
        .await?
        .ok_or_else(|| AppError::NotFound("Task not found".to_string()))?;

    // Use the robust, manual QueryBuilder pattern for dynamic updates.
    let mut query_builder: QueryBuilder<sqlx::Postgres> =
        QueryBuilder::new("UPDATE tasks SET ");

    let mut has_update = false;
    let mut add_separator = |qb: &mut QueryBuilder<sqlx::Postgres>| {
        if has_update {
            qb.push(", ");
        }
        has_update = true;
    };

    if let Some(name) = payload.name {
        add_separator(&mut query_builder);
        query_builder.push("name = ");
        query_builder.push_bind(name);
    }
    if let Some(description) = payload.description {
        add_separator(&mut query_builder);
        query_builder.push("description = ");
        query_builder.push_bind(description);
    }
    if let Some(points) = payload.points {
        add_separator(&mut query_builder);
        query_builder.push("points = ");
        query_builder.push_bind(points);
    }
    if let Some(category) = payload.category {
        add_separator(&mut query_builder);
        query_builder.push("category = ");
        query_builder.push_bind(category);
    }
    if let Some(is_mandatory) = payload.is_mandatory {
        add_separator(&mut query_builder);
        query_builder.push("is_mandatory = ");
        query_builder.push_bind(is_mandatory);
    }

    if !has_update {
        return Err(AppError::Validation(validator::ValidationErrors::new()));
    }

    query_builder.push(" WHERE id = ");
    query_builder.push_bind(task_id);
    query_builder.push(" AND user_id = ");
    query_builder.push_bind(user_id);
    query_builder.push(" RETURNING *");

    let result: Task = query_builder
        .build_query_as()
        .fetch_one(&state.db_pool)
        .await?;

    Ok(Json(result))
}


pub async fn delete_task_handler(
    State(state): State<AppState>,
    AuthUser(user_id): AuthUser,
    Path(task_id): Path<Uuid>,
) -> Result<impl IntoResponse, AppError> {
    let result = sqlx::query("DELETE FROM tasks WHERE id = $1 AND user_id = $2")
        .bind(task_id)
        .bind(user_id)
        .execute(&state.db_pool)
        .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound("Task not found or you do not have permission to delete it".to_string()));
    }

    Ok(StatusCode::NO_CONTENT)
}