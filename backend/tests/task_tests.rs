// backend/tests/task_tests.rs

mod common;

use crate::common::{spawn_app, TestApp};
use backend::tasks::models::Task;
use reqwest::Client;
use serde::Deserialize;
use serde_json::{json, Value};

#[derive(Deserialize)]
struct UserPublicResponse {
    id: uuid::Uuid,
}


struct UserFixture {
    pub id: uuid::Uuid,
    pub token: String,
}

async fn create_user_and_login(app: &TestApp, username: &str, email: &str) -> UserFixture {
    let client = Client::new();

    // --- Register User ---
    let register_body = json!({ "username": username, "email": email, "password": "password123" });
    let register_response = client
        .post(format!("{}/api/v1/auth/register", &app.address))
        .json(&register_body)
        .send()
        .await
        .expect("Setup: Failed to register user.");

    // Deserialize the registration response to get the user's ID
    let user_response: UserPublicResponse = register_response
        .json()
        .await
        .expect("Setup: Failed to deserialize registration response.");
    let user_id = user_response.id;

    // --- Login User ---
    let login_body = json!({ "email": email, "password": "password123" });
    let login_response = client
        .post(format!("{}/api/v1/auth/login", &app.address))
        .json(&login_body)
        .send()
        .await
        .expect("Setup: Failed to login.");
    
    let login_json: Value = login_response.json().await.expect("Setup: Login response should be JSON.");
    let token = login_json["token"].as_str().expect("Setup: Token not found in login response.").to_string();

    UserFixture { id: user_id, token }
}


#[tokio::test(flavor = "multi_thread", worker_threads = 1)]
async fn create_task_succeeds_with_valid_data() {
    // Arrange
    let app = spawn_app().await;
    let client = Client::new();
    let user = create_user_and_login(&app, "user1", "user1@test.com").await;

    let body = json!({
        "name": "Read a book",
        "description": "Read for 30 minutes",
        "points": 10,
        "category": "Mental",
        "is_mandatory": false
    });

    // Act
    let response = client
        .post(format!("{}/api/v1/tasks", &app.address))
        .bearer_auth(&user.token)
        .json(&body)
        .send()
        .await
        .expect("Failed to execute request.");

    // Assert
    assert_eq!(response.status().as_u16(), 201);

    let saved_task = sqlx::query_as!(
        Task,
        r#"
        SELECT id, user_id, name, description, points, category as "category: _", is_mandatory, created_at, updated_at
        FROM tasks
        "#,
    )
    .fetch_one(&app.db_pool)
    .await
    .expect("Failed to fetch saved task.");

    assert_eq!(saved_task.name, "Read a book");
    assert_eq!(saved_task.user_id, user.id);
}


#[tokio::test(flavor = "multi_thread", worker_threads = 1)]
async fn get_tasks_returns_only_user_owned_tasks() {
    // Arrange
    let app = spawn_app().await;
    let client = Client::new();
    let user1 = create_user_and_login(&app, "user1", "user1@test.com").await;
    let user2 = create_user_and_login(&app, "user2", "user2@test.com").await;

    // User 1 creates a task
    client
        .post(format!("{}/api/v1/tasks", &app.address))
        .bearer_auth(&user1.token)
        .json(&json!({"name": "User 1 Task", "points": 10, "category": "Physical", "is_mandatory": true}))
        .send()
        .await
        .unwrap();

    // User 2 creates a task
    client
        .post(format!("{}/api/v1/tasks", &app.address))
        .bearer_auth(&user2.token)
        .json(&json!({"name": "User 2 Task", "points": 5, "category": "Mental", "is_mandatory": false}))
        .send()
        .await
        .unwrap();

    // Act: User 1 fetches their tasks
    let response = client
        .get(format!("{}/api/v1/tasks", &app.address))
        .bearer_auth(&user1.token)
        .send()
        .await
        .unwrap();

    // Assert
    assert_eq!(response.status().as_u16(), 200);
    let tasks: Vec<Task> = response.json().await.unwrap();
    assert_eq!(tasks.len(), 1);
    assert_eq!(tasks[0].name, "User 1 Task");
    assert_eq!(tasks[0].user_id, user1.id);
}

#[tokio::test(flavor = "multi_thread", worker_threads = 1)]
async fn update_task_fails_for_non_existent_task() {
    // Arrange
    let app = spawn_app().await;
    let client = Client::new();
    let user = create_user_and_login(&app, "user1", "user1@test.com").await;
    let non_existent_id = uuid::Uuid::new_v4();

    // Act
    let response = client
        .put(format!("{}/api/v1/tasks/{}", &app.address, non_existent_id))
        .bearer_auth(&user.token)
        .json(&json!({"name": "New Name"}))
        .send()
        .await
        .unwrap();

    // Assert
    assert_eq!(response.status().as_u16(), 404);
}

#[tokio::test(flavor = "multi_thread", worker_threads = 1)]
async fn delete_task_succeeds_for_owned_task() {
    // Arrange
    let app = spawn_app().await;
    let client = Client::new();
    let user = create_user_and_login(&app, "user1", "user1@test.com").await;
    
    // Create a task to delete
    let create_response = client
        .post(format!("{}/api/v1/tasks", &app.address))
        .bearer_auth(&user.token)
        .json(&json!({"name": "To be deleted", "points": 1, "category": "Mental", "is_mandatory": false}))
        .send()
        .await
        .unwrap();
    let created_task: Task = create_response.json().await.unwrap();

    // Act
    let delete_response = client
        .delete(format!("{}/api/v1/tasks/{}", &app.address, created_task.id))
        .bearer_auth(&user.token)
        .send()
        .await
        .unwrap();
    
    // Assert
    assert_eq!(delete_response.status().as_u16(), 204);
    let count = sqlx::query!("SELECT count(*) FROM tasks WHERE id = $1", created_task.id)
        .fetch_one(&app.db_pool)
        .await
        .unwrap()
        .count
        .unwrap();
    assert_eq!(count, 0);
}