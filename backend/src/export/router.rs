// backend/src/export/router.rs
use super::handlers::export_data_handler;
use crate::state::AppState;
use axum::{routing::get, Router};

pub fn create_router(state: AppState) -> Router {
    Router::new()
        .route("/", get(export_data_handler))
        .with_state(state)
}