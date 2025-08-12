use sqlx::PgPool;

use crate::config::Settings;

#[derive(Clone)]
pub struct AppState {
    pub db_pool: PgPool,
    pub settings: Settings, 
}