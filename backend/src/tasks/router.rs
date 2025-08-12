use super::handlers::{
    create_task_handler, delete_task_handler, get_tasks_handler, update_task_handler,
};
use crate::state::AppState;
use axum::{
    routing::{post, put},
    Router,
};

pub fn create_router(state: AppState) -> Router {
    Router::new()
        // Now both `post` and `get` are in scope and will work correctly.
        .route("/", post(create_task_handler).get(get_tasks_handler))
        .route(
            "/:task_id",
            // Use the imported methods for consistency.
            put(update_task_handler).delete(delete_task_handler),
        )
        .with_state(state)
}