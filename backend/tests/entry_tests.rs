mod common;

use crate::common::{spawn_app, TestApp};
use backend::entries::models::{Entry, GetEntriesResponse};
use backend::tasks::models::Task;
use chrono::Utc;
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



async fn create_task(app: &TestApp, token: &str, name: &str, points: i32) -> Task {
    let client = Client::new();
    let response = client
        .post(format!("{}/api/v1/tasks", &app.address))
        .bearer_auth(token)
        .json(&json!({"name": name, "points": points, "category": "Mental", "is_mandatory": false}))
        .send()
        .await
        .unwrap();
    assert_eq!(response.status().as_u16(), 201);
    response.json().await.unwrap()
}

#[tokio::test(flavor = "multi_thread", worker_threads = 1)]
async fn create_entry_succeeds_and_updates_user_points() {
    // Arrange
    let app = spawn_app().await;
    let user = create_user_and_login(&app, "user1", "user1@test.com").await;
    let task = create_task(&app, &user.token, "Read a chapter", 25).await;
    let client = Client::new();

    let initial_points = sqlx::query!("SELECT total_points FROM users WHERE id = $1", user.id)
        .fetch_one(&app.db_pool)
        .await
        .unwrap()
        .total_points;
    assert_eq!(initial_points, 0);

    let today = Utc::now().format("%Y-%m-%d").to_string();
    let body = json!({
        "taskId": task.id,
        "date": today,
        "notes": "Finished the intro."
    });

    // Act
    let response = client
        .post(format!("{}/api/v1/entries", &app.address))
        .bearer_auth(&user.token)
        .json(&body)
        .send()
        .await
        .unwrap();

    // Assert
    assert_eq!(response.status().as_u16(), 201);

    let final_points = sqlx::query!("SELECT total_points FROM users WHERE id = $1", user.id)
        .fetch_one(&app.db_pool)
        .await
        .unwrap()
        .total_points;
    assert_eq!(final_points, 25);
}

#[tokio::test(flavor = "multi_thread", worker_threads = 1)]
async fn delete_entry_succeeds_and_reverts_user_points() {
    // Arrange
    let app = spawn_app().await;
    let user = create_user_and_login(&app, "user1", "user1@test.com").await;
    let task = create_task(&app, &user.token, "Morning Jog", 30).await;
    let client = Client::new();
    let today = Utc::now().format("%Y-%m-%d").to_string();
    
    // Create the entry first
    let create_response = client
        .post(format!("{}/api/v1/entries", &app.address))
        .bearer_auth(&user.token)
        .json(&json!({"taskId": task.id, "date": today}))
        .send()
        .await
        .unwrap();
    let entry: Entry = create_response.json().await.unwrap();

    let points_after_creation = sqlx::query!("SELECT total_points FROM users WHERE id = $1", user.id)
        .fetch_one(&app.db_pool).await.unwrap().total_points;
    assert_eq!(points_after_creation, 30);

    // Act
    let delete_response = client
        .delete(format!("{}/api/v1/entries/{}", &app.address, entry.id))
        .bearer_auth(&user.token)
        .send()
        .await
        .unwrap();

    // Assert
    assert_eq!(delete_response.status().as_u16(), 204);
    let final_points = sqlx::query!("SELECT total_points FROM users WHERE id = $1", user.id)
        .fetch_one(&app.db_pool).await.unwrap().total_points;
    assert_eq!(final_points, 0);
}

#[tokio::test(flavor = "multi_thread", worker_threads = 1)]
async fn get_entries_by_date_returns_correct_data_and_total() {
    // Arrange
    let app = spawn_app().await;
    let user = create_user_and_login( &app, "user1", "user1@test.com").await;
    let task1 = create_task(&app, &user.token, "Task One", 10).await;
    let task2 = create_task(&app, &user.token, "Task Two", 15).await;
    let client = Client::new();
    let today = Utc::now().format("%Y-%m-%d").to_string();

    // Create two entries for today
    client.post(format!("{}/api/v1/entries", &app.address)).bearer_auth(&user.token).json(&json!({"taskId": task1.id, "date": today})).send().await.unwrap();
    client.post(format!("{}/api/v1/entries", &app.address)).bearer_auth(&user.token).json(&json!({"taskId": task2.id, "date": today})).send().await.unwrap();
    
    // Act
    let response = client
        .get(format!("{}/api/v1/entries?date={}", &app.address, today))
        .bearer_auth(&user.token)
        .send()
        .await
        .unwrap();

    // Assert
    assert_eq!(response.status().as_u16(), 200);
    let body: GetEntriesResponse = response.json().await.unwrap();
    assert_eq!(body.entries.len(), 2);
    assert_eq!(body.total_points, 25);
}

#[tokio::test(flavor = "multi_thread", worker_threads = 1)]
async fn update_entry_notes_succeeds() {
    // Arrange
    let app = spawn_app().await;
    let user = create_user_and_login(&app, "user1", "user1@test.com").await;
    let task = create_task(&app, &user.token, "Plan the week", 5).await;
    let client = Client::new();
    let today = Utc::now().format("%Y-%m-%d").to_string();

    // Create an entry with no notes
    let create_response = client
        .post(format!("{}/api/v1/entries", &app.address))
        .bearer_auth(&user.token)
        .json(&json!({"taskId": task.id, "date": today}))
        .send()
        .await
        .unwrap();
    let entry: Entry = create_response.json().await.unwrap();
    assert!(entry.notes.is_none());

    // Act
    let update_body = json!({"notes": "Weekly plan is now complete."});
    let update_response = client
        .put(format!("{}/api/v1/entries/{}", &app.address, entry.id))
        .bearer_auth(&user.token)
        .json(&update_body)
        .send()
        .await
        .unwrap();

    // Assert
    assert_eq!(update_response.status().as_u16(), 200);
    let updated_entry: Entry = update_response.json().await.unwrap();
    assert_eq!(updated_entry.notes, Some("Weekly plan is now complete.".to_string()));

    // Verify points did not change
    let final_points = sqlx::query!("SELECT total_points FROM users WHERE id = $1", user.id)
        .fetch_one(&app.db_pool).await.unwrap().total_points;
    assert_eq!(final_points, 5);
}

#[tokio::test(flavor = "multi_thread", worker_threads = 1)]
async fn user_cannot_delete_another_users_entry() {
    // Arrange
    let app = spawn_app().await;
    let client = Client::new();

    // User 1 creates a task and an entry
    let user1 = create_user_and_login(&app, "user1", "user1@test.com").await;
    let task1 = create_task(&app, &user1.token, "User 1's Task", 10).await;
    let create_response = client
        .post(format!("{}/api/v1/entries", &app.address))
        .bearer_auth(&user1.token)
        .json(&json!({"taskId": task1.id, "date": Utc::now().format("%Y-%m-%d").to_string()}))
        .send()
        .await
        .unwrap();
    let entry_to_delete: Entry = create_response.json().await.unwrap();

    // User 2 logs in
    let user2 = create_user_and_login(&app, "user2", "user2@test.com").await;

    // Act: User 2 attempts to delete User 1's entry
    let response = client
        .delete(format!("{}/api/v1/entries/{}", &app.address, entry_to_delete.id))
        .bearer_auth(&user2.token) // Authenticated as User 2
        .send()
        .await
        .unwrap();
    
    // Assert
    // The handler should correctly identify that the entry does not belong to User 2.
    assert_eq!(response.status().as_u16(), 404);

    // Verify the entry still exists in the database
    let count = sqlx::query!("SELECT count(*) FROM entries WHERE id = $1", entry_to_delete.id)
        .fetch_one(&app.db_pool)
        .await
        .unwrap()
        .count
        .unwrap();
    assert_eq!(count, 1);
}
