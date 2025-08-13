// backend/src/analytics/router.rs
use super::handlers::{get_analytics_handler};
use crate::state::AppState;
use axum::{routing::get, Router};

pub fn create_router(state: AppState) -> Router {
    Router::new()
        .route("/", get(get_analytics_handler))
        .with_state(state)
}