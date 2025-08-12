use super::handlers::{create_entry_handler, delete_entry_handler, get_entries_handler, update_entry_handler};
use crate::state::AppState;
use axum::{
    routing::{put, post},
    Router,
};

pub fn create_router(state: AppState) -> Router {
    Router::new()
        .route("/", post(create_entry_handler).get(get_entries_handler))
                .route(
            "/:entry_id",
            // Chain the new `put` handler here
            put(update_entry_handler).delete(delete_entry_handler),
        )
        .with_state(state)
}