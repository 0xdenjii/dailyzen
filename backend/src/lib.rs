pub mod auth;
pub mod config;
pub mod errors;
pub mod state;
pub mod users;

use axum::{routing::get, Json, Router};
use state::AppState;
use std::net::SocketAddr;
use tower_http::cors::{Any, CorsLayer};
use tracing::info;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

pub async fn run() -> Result<(), errors::AppError> {
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "backend=debug,tower_http=debug".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    info!("Loading configuration...");
    dotenvy::dotenv().ok();
    let settings = config::get_config().expect("Failed to read configuration.");

    info!("Connecting to the database...");
    let db_pool = sqlx::PgPool::connect(&settings.database_connection_string())
        .await
        .expect("Failed to connect to Postgres.");

    info!("Running database migrations...");
    sqlx::migrate!("./migrations")
        .run(&db_pool)
        .await
        .expect("Failed to run database migrations.");
    info!("Database migrations complete.");

    let app_state = AppState {
        db_pool,
        settings: settings.clone(),
    };

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let app = Router::new()
        .route("/", get(health_check_handler))
        .nest("/api/v1", users::router::create_router(app_state.clone()))
        .layer(cors)
        .layer(tower_http::trace::TraceLayer::new_for_http());

    let addr = SocketAddr::from(([0, 0, 0, 0], settings.application_port));
    info!("Server listening on {}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}

async fn health_check_handler() -> Json<serde_json::Value> {
    Json(serde_json::json!({ "status": "ok" }))
}