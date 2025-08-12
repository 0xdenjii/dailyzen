use axum::{extract::State, http::StatusCode, response::IntoResponse, Json};
use serde_json::json;
use sqlx::postgres::PgDatabaseError;
use validator::Validate;

use crate::{
    auth::create_jwt,
    errors::AppError,
    state::AppState,
    users::models::{LoginUser, RegisterUser, User, UserPublic},
};

// Race condition prevention: Directly insert the user without a prior SELECT
pub async fn register_handler(
    State(state): State<AppState>,
    Json(payload): Json<RegisterUser>,
) -> Result<impl IntoResponse, AppError> {
    payload.validate()?;

    // Hash the password before the database transaction
    let password_hash = bcrypt::hash(&payload.password, bcrypt::DEFAULT_COST)?;

    // Directly attempt to insert the new user.
    // We remove the initial `SELECT` to prevent race conditions.
    let new_user: User = sqlx::query_as(
        "INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING *",
    )
    .bind(&payload.username)
    .bind(&payload.email)
    .bind(password_hash)
    .fetch_one(&state.db_pool)
    .await
    .map_err(|e| {
        // We need to check if the error is a unique constraint violation
        if let Some(db_err) = e.as_database_error() {
            if let Some(pg_err) = db_err.try_downcast_ref::<PgDatabaseError>() {
                // The error code '23505' is for 'unique_violation' in PostgreSQL
                if pg_err.code() == "23505" {
                    return AppError::UserAlreadyExists;
                }
            }
        }
        // For all other errors, we return the original database error
        AppError::Sqlx(e)
    })?;

    // Use our new `From` trait implementation via `.into()` for a clean conversion.
    let user_public: UserPublic = new_user.into();

    Ok((StatusCode::CREATED, Json(user_public)))
}

pub async fn login_handler(
    State(state): State<AppState>,
    Json(payload): Json<LoginUser>,
) -> Result<impl IntoResponse, AppError> {
    payload.validate()?;

    let user: User = sqlx::query_as("SELECT * FROM users WHERE email = $1")
        .bind(&payload.email)
        .fetch_optional(&state.db_pool)
        .await?
        .ok_or(AppError::WrongCredentials)?;

    let is_valid_password = bcrypt::verify(&payload.password, &user.password_hash)?;

    if !is_valid_password {
        return Err(AppError::WrongCredentials);
    }

    let token = create_jwt(user.id, &state.settings.jwt_secret)?;

    Ok(Json(json!({ "token": token })))
}