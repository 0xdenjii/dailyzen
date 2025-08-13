// backend/src/notes/router.rs
use super::handlers::{get_note_handler, upsert_note_handler, get_recent_notes_handler};
use crate::state::AppState;
use axum::{routing::{get, post}, Router};

pub fn create_router(state: AppState) -> Router {
    Router::new()
        // A single route handles getting a note (GET) and creating/updating it (POST).
        .route("/recent", get(get_recent_notes_handler))
        .route("/", post(upsert_note_handler).get(get_note_handler))
        .with_state(state)
}
