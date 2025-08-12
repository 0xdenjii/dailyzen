use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;
use thiserror::Error;
use bcrypt::BcryptError;

#[derive(Error, Debug)]
pub enum AppError {
    #[error("Database error: {0}")]
    Sqlx(#[from] sqlx::Error),

    #[error("I/O error: {0}")]
    Io(#[from] std::io::Error),

    #[error("Internal server error: {0}")]
    Anyhow(#[from] anyhow::Error),

        // --- AUTH ---
    #[error("Wrong credentials")]
    WrongCredentials,
    #[error("Invalid token")]
    InvalidToken,
    #[error("Missing credentials")]
    MissingCredentials,
    #[error("Token has expired")]
    TokenExpired,
    #[error(transparent)]
    Bcrypt(#[from] BcryptError),

    // --- USER ---
    #[error("A user with this email or username already exists")]
    UserAlreadyExists,
    #[error("User not found")]
    UserNotFound,

     // --- RESOURCE ---
    #[error("Not found: {0}")]
    NotFound(String),

    // --- OTHER ---
    #[error("Validation error: {0}")]
    Validation(#[from] validator::ValidationErrors),
   
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, error_message) = match self {
            AppError::Sqlx(e) => {
                tracing::error!("Database error: {:?}", e);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "An internal database error occurred".to_string(),
                )
            }
            AppError::Io(e) => {
                tracing::error!("I/O error: {:?}", e);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "An internal server error occurred".to_string(),
                )
            }
            AppError::Anyhow(e) => {
                tracing::error!("Generic internal error: {:?}", e);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "An internal server error occurred".to_string(),
                )
            },
            AppError::Validation(err) => {
                let message = format!("Input validation error: [{}]", err).replace('\n', ", ");
                (StatusCode::BAD_REQUEST, message)
            }
            AppError::WrongCredentials => (StatusCode::UNAUTHORIZED, self.to_string()),
            AppError::MissingCredentials => (StatusCode::UNAUTHORIZED, self.to_string()),
            AppError::InvalidToken => (StatusCode::UNAUTHORIZED, self.to_string()),
            AppError::TokenExpired => (StatusCode::UNAUTHORIZED, self.to_string()),
            AppError::UserNotFound => (StatusCode::NOT_FOUND, self.to_string()),
            AppError::UserAlreadyExists => (StatusCode::CONFLICT, self.to_string()),
            AppError::NotFound(message) => (StatusCode::NOT_FOUND, message),
            _ => {
                tracing::error!("Internal server error: {:?}", self);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "An internal server error occurred".to_string(),
                )
            }
        };

        let body = Json(json!({ "error": error_message }));
        (status, body).into_response()
    }
}