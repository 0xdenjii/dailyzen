use super::handlers::{
    create_goal_handler, delete_goal_handler, get_goals_handler, update_goal_handler,
};
use crate::state::AppState;
use axum::{
    routing::{post, put},
    Router,
};

pub fn create_router(state: AppState) -> Router {
    Router::new()
        .route("/", post(create_goal_handler).get(get_goals_handler))
        .route(
            "/:goal_id",
            put(update_goal_handler).delete(delete_goal_handler),
        )
        .with_state(state)
}