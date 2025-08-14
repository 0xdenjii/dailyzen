pub mod analytics;
pub mod auth;
pub mod config;
pub mod entries;
pub mod errors;
pub mod export;
pub mod goals;
pub mod jobs;
pub mod notes;
pub mod state;
pub mod tasks;
pub mod users;

use axum::{routing::get, Json, Router};
use state::AppState;
use std::{env, net::SocketAddr};
use tokio_cron_scheduler::{Job, JobScheduler};
use tower_http::cors::{Any, CorsLayer};
use tracing::info;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

use crate::jobs::daily_check::job_runner;

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
    let database_url =
        env::var("DATABASE_URL").unwrap_or_else(|_| settings.database_connection_string());

    println!("Using database URL: {}", database_url);
    let db_pool = sqlx::PgPool::connect(&database_url)
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

    let scheduler = JobScheduler::new().await?;
    let job_state = app_state.clone();

    scheduler
        .add(Job::new_async("0 0 0 * * *", move |_, _| {
            let state = job_state.clone();
            Box::pin(async move {
                job_runner(state).await; // And this is the function call
            })
        })?)
        .await?;

    scheduler.start().await?;
    info!("Daily check cron job scheduled.");

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let app = Router::new()
        .route("/", get(health_check_handler))
        .nest("/api/v1", users::router::create_router(app_state.clone()))
        .nest(
            "/api/v1/tasks",
            tasks::router::create_router(app_state.clone()),
        )
        .nest(
            "/api/v1/entries",
            entries::router::create_router(app_state.clone()),
        )
        .nest(
            "/api/v1/goals",
            goals::router::create_router(app_state.clone()),
        )
        .nest(
            "/api/v1/notes",
            notes::router::create_router(app_state.clone()),
        )
        .nest(
            "/api/v1/analytics",
            analytics::router::create_router(app_state.clone()),
        )
        .nest(
            "/api/v1/export",
            export::router::create_router(app_state.clone()),
        )
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
