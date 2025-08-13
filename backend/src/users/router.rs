use super::handlers::{login_handler, register_handler, get_current_user_handler};
use crate::state::AppState;
use axum::{
    Router,
    routing::{get, post},
};
async fn protected_handler(auth_user: crate::auth::AuthUser) -> axum::Json<serde_json::Value> {
    axum::Json(serde_json::json!({ "success": true, "user_id": auth_user.0 }))
}

pub fn create_router(state: AppState) -> Router {
    Router::new()
        .route("/auth/register", post(register_handler))
        .route("/auth/login", post(login_handler))
        .route("/protected", get(protected_handler))
                .route("/users/me", get(get_current_user_handler))

        .with_state(state)
}
