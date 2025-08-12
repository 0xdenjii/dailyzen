use backend::config::{get_config, Settings};
use backend::state::AppState;
use backend::{entries, tasks, users};
use once_cell::sync::Lazy;
use sqlx::{Connection, Executor, PgConnection, PgPool};
use tokio::net::TcpListener;
use uuid::Uuid;
use axum::Router;

static TRACING: Lazy<()> = Lazy::new(|| {
    let default_filter = "info,backend=debug".to_string();
    let env_filter = std::env::var("RUST_LOG").unwrap_or(default_filter);
    tracing_subscriber::fmt()
        .with_env_filter(env_filter)
        .with_test_writer()
        .init();
});

pub struct TestApp {
    pub address: String,
    pub db_pool: PgPool,
    settings: Settings,
    db_name: String,
}

impl Drop for TestApp {
    fn drop(&mut self) {
        let settings = self.settings.clone();
        let db_name = self.db_name.clone();
        tokio::task::block_in_place(move || {
            tokio::runtime::Handle::current().block_on(async move {
                let maintenance_db_url = settings.maintenance_database_connection_string();
                let mut conn = PgConnection::connect(&maintenance_db_url)
                    .await
                    .expect("Failed to connect to maintenance DB for cleanup");

                conn.execute(&*format!(r#"
                    SELECT pg_terminate_backend(pid)
                    FROM pg_stat_activity
                    WHERE datname = '{}' AND pid <> pg_backend_pid();
                "#, db_name)).await.unwrap();

                conn.execute(&*format!(r#"DROP DATABASE "{}";"#, db_name))
                    .await
                    .expect("Failed to drop test database.");
            });
        });
    }
}

pub async fn spawn_app() -> TestApp {
    Lazy::force(&TRACING);

    let listener = TcpListener::bind("127.0.0.1:0")
        .await
        .expect("Failed to bind random port");
    let port = listener.local_addr().unwrap().port();
    let address = format!("http://127.0.0.1:{}", port);

    dotenvy::dotenv().ok();
    let mut settings = get_config().expect("Failed to read configuration.");
    let db_name = format!("test_db_{}", Uuid::new_v4());
    settings.database.db_name = db_name.clone();

    let mut connection = PgConnection::connect(&settings.maintenance_database_connection_string())
        .await
        .expect("Failed to connect to 'postgres' maintenance database.");

    
    connection
        .execute(format!(r#"CREATE DATABASE "{}";"#, settings.database.db_name).as_str())
        .await
        .expect("Failed to create test database.");

    // Connect to the new test database and run migrations
    let db_pool = PgPool::connect(&settings.database_connection_string())
        .await
        .expect("Failed to connect to the newly created test database.");
    sqlx::migrate!("./migrations")
        .run(&db_pool)
        .await
        .expect("Failed to run migrations on test database.");

    // Create the AppState with the new settings
    let app_state = AppState {
        db_pool: db_pool.clone(),
        settings: settings.clone(),
    };

    let app = Router::new()
        .nest("/api/v1", users::router::create_router(app_state.clone()))
        .nest("/api/v1/tasks", tasks::router::create_router(app_state.clone()))
        .nest("/api/v1/entries", entries::router::create_router(app_state.clone()));


    tokio::spawn(async move {
        axum::serve(listener, app)
            .await
            .unwrap();
    });

    TestApp {
        address,
        db_pool,
        settings,
        db_name,
    }
}
