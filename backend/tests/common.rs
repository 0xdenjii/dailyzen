use axum::Router;
use backend::config::{get_config, Settings};
use backend::entries::models::Entry;
use backend::state::AppState;
use backend::tasks::models::Task;
use backend::{analytics, entries, export, goals, notes, tasks, users};
use once_cell::sync::Lazy;
use reqwest::Client;
use serde::Deserialize;
use serde_json::{json, Value};
use sqlx::{Connection, Executor, PgConnection, PgPool};
use tokio::net::TcpListener;
use uuid::Uuid;

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

                conn.execute(&*format!(
                    r#"
                    SELECT pg_terminate_backend(pid)
                    FROM pg_stat_activity
                    WHERE datname = '{}' AND pid <> pg_backend_pid();
                "#,
                    db_name
                ))
                .await
                .unwrap();

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
        );

    tokio::spawn(async move {
        axum::serve(listener, app).await.unwrap();
    });

    TestApp {
        address,
        db_pool,
        settings,
        db_name,
    }
}

#[allow(dead_code)]
pub struct UserFixture {
    pub id: uuid::Uuid,
    pub token: String,
}

#[allow(dead_code)]
#[derive(Deserialize)]
struct UserPublicResponse {
    id: uuid::Uuid,
}

#[allow(dead_code)]
impl TestApp {
    // This helper was already here, but we ensure it's the single source of truth.
    pub async fn create_user_and_login(&self, username: &str, email: &str) -> UserFixture {
        let client = Client::new();
        let register_body =
            json!({ "username": username, "email": email, "password": "password123" });
        let register_response = client
            .post(format!("{}/api/v1/auth/register", &self.address))
            .json(&register_body)
            .send()
            .await
            .expect("Setup: Failed to register user.");

        let user_response: UserPublicResponse = register_response
            .json()
            .await
            .expect("Setup: Failed to deserialize registration response.");
        let user_id = user_response.id;

        let login_body = json!({ "email": email, "password": "password123" });
        let login_response = client
            .post(format!("{}/api/v1/auth/login", &self.address))
            .json(&login_body)
            .send()
            .await
            .expect("Setup: Failed to login.");

        let login_json: Value = login_response
            .json()
            .await
            .expect("Setup: Login response should be JSON.");
        let token = login_json["token"]
            .as_str()
            .expect("Setup: Token not found in login response.")
            .to_string();

        UserFixture { id: user_id, token }
    }

    // New centralized helper to create a standard task.
    pub async fn create_task(&self, token: &str, name: &str, points: i32) -> Task {
        self.create_task_with_options(token, name, points, false).await
    }

    // New centralized helper to create a mandatory task.
    pub async fn create_mandatory_task(&self, token: &str, name: &str, points: i32) -> Task {
        self.create_task_with_options(token, name, points, true).await
    }

    // Private helper to reduce duplication between task creation helpers.
    async fn create_task_with_options(&self, token: &str, name: &str, points: i32, is_mandatory: bool) -> Task {
        let client = Client::new();
        let response = client
            .post(format!("{}/api/v1/tasks", &self.address))
            .bearer_auth(token)
            .json(&json!({"name": name, "points": points, "category": "Mental", "is_mandatory": is_mandatory}))
            .send()
            .await
            .expect("Setup: Failed to create task.");

        assert_eq!(response.status().as_u16(), 201, "Setup: Task creation should return 201.");
        response.json().await.expect("Setup: Failed to deserialize created task.")
    }

    // New, essential helper for testing streaks and cron jobs.
    pub async fn create_entry_for_date(&self, token: &str, task_id: Uuid, date: &str) -> Entry {
        let client = Client::new();
        let response = client
            .post(format!("{}/api/v1/entries", &self.address))
            .bearer_auth(token)
            .json(&json!({"taskId": task_id, "date": date}))
            .send()
            .await
            .expect("Setup: Failed to create entry for a specific date.");
        
        assert_eq!(response.status().as_u16(), 201, "Setup: Entry creation should return 201.");
        response.json().await.expect("Setup: Failed to deserialize created entry.")
    }
}
