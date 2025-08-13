// backend/src/goals/handlers.rs
use crate::auth::AuthUser;
use crate::errors::AppError;
use crate::goals::models::{CreateGoal, Goal, UpdateGoal};
use crate::state::AppState;
use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use sqlx::QueryBuilder;
use uuid::Uuid;
use validator::Validate;

pub async fn create_goal_handler(
    State(state): State<AppState>,
    AuthUser(user_id): AuthUser,
    Json(payload): Json<CreateGoal>,
) -> Result<impl IntoResponse, AppError> {
    payload.validate()?;

    let new_goal: Goal = sqlx::query_as(
        r#"
        INSERT INTO goals (user_id, description, category, deadline, penalty)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
        "#,
    )
    .bind(user_id)
    .bind(payload.description)
    .bind(payload.category)
    .bind(payload.deadline)
    .bind(payload.penalty)
    .fetch_one(&state.db_pool)
    .await?;

    Ok((StatusCode::CREATED, Json(new_goal)))
}

pub async fn get_goals_handler(
    State(state): State<AppState>,
    AuthUser(user_id): AuthUser,
) -> Result<impl IntoResponse, AppError> {
    let goals: Vec<Goal> = sqlx::query_as("SELECT * FROM goals WHERE user_id = $1 ORDER BY deadline ASC")
        .bind(user_id)
        .fetch_all(&state.db_pool)
        .await?;

    Ok(Json(goals))
}


pub async fn delete_goal_handler(
    State(state): State<AppState>,
    AuthUser(user_id): AuthUser,
    Path(goal_id): Path<Uuid>,
) -> Result<impl IntoResponse, AppError> {
    let result = sqlx::query("DELETE FROM goals WHERE id = $1 AND user_id = $2")
        .bind(goal_id)
        .bind(user_id)
        .execute(&state.db_pool)
        .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound(
            "Goal not found or you do not have permission to delete it".to_string(),
        ));
    }

    Ok(StatusCode::NO_CONTENT)
}

pub async fn update_goal_handler(
    State(state): State<AppState>,
    AuthUser(user_id): AuthUser,
    Path(goal_id): Path<Uuid>,
    Json(payload): Json<UpdateGoal>,
) -> Result<impl IntoResponse, AppError> {
    payload.validate()?;

    // This verification step is correct.
    sqlx::query("SELECT id FROM goals WHERE id = $1 AND user_id = $2")
        .bind(goal_id)
        .bind(user_id)
        .fetch_optional(&state.db_pool)
        .await?
        .ok_or_else(|| AppError::NotFound("Goal not found".to_string()))?;


    let mut query_builder: QueryBuilder<sqlx::Postgres> =
        QueryBuilder::new("UPDATE goals SET ");
    
    // We will use a simple boolean flag to manage commas manually.
    let mut has_update = false;

    // Helper closure to add a comma if this is not the first field.
    let mut add_separator = |qb: &mut QueryBuilder<sqlx::Postgres>| {
        if has_update {
            qb.push(", ");
        }
        has_update = true;
    };

    if let Some(description) = payload.description {
        add_separator(&mut query_builder);
        query_builder.push("description = ");
        query_builder.push_bind(description);
    }
    if let Some(category) = payload.category {
        add_separator(&mut query_builder);
        query_builder.push("category = ");
        query_builder.push_bind(category);
    }
    if let Some(deadline) = payload.deadline {
        add_separator(&mut query_builder);
        query_builder.push("deadline = ");
        query_builder.push_bind(deadline);
    }
    if let Some(penalty) = payload.penalty {
        add_separator(&mut query_builder);
        query_builder.push("penalty = ");
        query_builder.push_bind(penalty);
    }
    if let Some(progress) = payload.progress {
        add_separator(&mut query_builder);
        query_builder.push("progress = ");
        query_builder.push_bind(progress);
        
        // This is still part of the same logical update, so we need a separator
        add_separator(&mut query_builder);
        query_builder.push("is_completed = ");
        query_builder.push_bind(progress == 100);
    }

    // If no fields were provided in the payload, `has_update` will be false.
    if !has_update {
        return Err(AppError::Validation(validator::ValidationErrors::new()));
    }

    // Append the WHERE clause to scope the update correctly.
    query_builder.push(" WHERE id = ");
    query_builder.push_bind(goal_id);
    query_builder.push(" AND user_id = ");
    query_builder.push_bind(user_id);
    query_builder.push(" RETURNING *");

    println!("Executing query: {}", query_builder.sql());

    // Execute the dynamically built query.
    let updated_goal: Goal = query_builder
        .build_query_as()
        .fetch_one(&state.db_pool)
        .await?;

    Ok(Json(updated_goal))
}
