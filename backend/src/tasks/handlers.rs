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
    let _task: Task = sqlx::query_as("SELECT * FROM tasks WHERE id = $1 AND user_id = $2")
        .bind(task_id)
        .bind(user_id)
        .fetch_optional(&state.db_pool)
        .await?
        .ok_or_else(|| AppError::NotFound("Task not found".to_string()))?;

    let mut has_fields = false; 
    let mut query_builder: QueryBuilder<sqlx::Postgres> =
        QueryBuilder::new("UPDATE tasks SET ");
    let mut separated = query_builder.separated(", ");

    if let Some(name) = payload.name {
        separated.push("name = ");
        separated.push_bind(name);
        has_fields = true; 
    }
    if let Some(description) = payload.description {
        separated.push("description = ");
        separated.push_bind(description);
        has_fields = true; 
    }
    if let Some(points) = payload.points {
        separated.push("points = ");
        separated.push_bind(points);
        has_fields = true; 
    }
    if let Some(category) = payload.category {
        separated.push("category = ");
        separated.push_bind(category);
        has_fields = true; 
    }
    if let Some(is_mandatory) = payload.is_mandatory {
        separated.push("is_mandatory = ");
        separated.push_bind(is_mandatory);
        has_fields = true; 
    }


    if !has_fields {
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