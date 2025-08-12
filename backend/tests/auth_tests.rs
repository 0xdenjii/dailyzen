mod common;

use common::spawn_app;
use reqwest::Client;
use serde_json::{json, Value};

#[tokio::test(flavor = "multi_thread", worker_threads = 1)]
async fn register_succeeds_with_valid_data() {
    // Arrange
    let app = spawn_app().await;
    let client = Client::new();

    let body = json!({
        "username": "testuser",
        "email": "test@example.com",
        "password": "password123"
    });

    // Act
    let response = client
        .post(format!("{}/api/v1/auth/register", &app.address))
        .json(&body)
        .send()
        .await
        .expect("Failed to execute request.");

    // Assert
    assert_eq!(response.status().as_u16(), 201);

    let saved_user = sqlx::query!("SELECT email, username FROM users")
        .fetch_one(&app.db_pool)
        .await
        .expect("Failed to fetch saved user.");

    assert_eq!(saved_user.email, "test@example.com");
    assert_eq!(saved_user.username, "testuser");
}

#[tokio::test(flavor = "multi_thread", worker_threads = 1)]
async fn register_fails_for_duplicate_email() {
    // Arrange
    let app = spawn_app().await;
    let client = Client::new();
    let body = json!({
        "username": "testuser",
        "email": "test@example.com",
        "password": "password123"
    });

    // First registration
    client.post(format!("{}/api/v1/auth/register", &app.address))
        .json(&body)
        .send()
        .await
        .expect("Failed to execute first request.");

    // Act: Second registration with same email
    let response = client
        .post(format!("{}/api/v1/auth/register", &app.address))
        .json(&json!({
            "username": "anotheruser",
            "email": "test@example.com",
            "password": "password123"
        }))
        .send()
        .await
        .expect("Failed to execute second request.");

    // Assert
    assert_eq!(response.status().as_u16(), 409); // 409 Conflict
}


#[tokio::test(flavor = "multi_thread", worker_threads = 1)]
async fn login_succeeds_with_valid_credentials() {
    // Arrange
    let app = spawn_app().await;
    let client = Client::new();

    // First, register a user
    let register_body = json!({
        "username": "testuser",
        "email": "test@example.com",
        "password": "password123"
    });
    client.post(format!("{}/api/v1/auth/register", &app.address))
        .json(&register_body)
        .send()
        .await
        .expect("Failed to register user.");

    let login_body = json!({
        "email": "test@example.com",
        "password": "password123"
    });

    // Act
    let response = client
        .post(format!("{}/api/v1/auth/login", &app.address))
        .json(&login_body)
        .send()
        .await
        .expect("Failed to execute login request.");

    // Assert
    assert_eq!(response.status().as_u16(), 200);
    let body: Value = response.json().await.expect("Login response should be valid JSON");
    assert!(body["token"].as_str().is_some(), "Login response should contain a token string");
}

#[tokio::test(flavor = "multi_thread", worker_threads = 1)]
async fn login_fails_with_wrong_password() {
    // Arrange
    let app = spawn_app().await;
    let client = Client::new();

    // First, register a user
    let register_body = json!({
        "username": "testuser",
        "email": "test@example.com",
        "password": "password123"
    });
    client.post(format!("{}/api/v1/auth/register", &app.address))
        .json(&register_body)
        .send()
        .await
        .expect("Failed to register user.");

    // Act: Attempt to login with wrong password
    let login_body = json!({
        "email": "test@example.com",
        "password": "wrongpassword"
    });
    let response = client
        .post(format!("{}/api/v1/auth/login", &app.address))
        .json(&login_body)
        .send()
        .await
        .expect("Failed to execute login request.");

    // Assert
    assert_eq!(response.status().as_u16(), 401); // Unauthorized
}

#[tokio::test(flavor = "multi_thread", worker_threads = 1)]
async fn protected_route_works_with_valid_token() {
    // Arrange
    let app = spawn_app().await;
    let client = Client::new();

    // Register and login to get a token
    let register_body = json!({ "username": "testuser", "email": "test@example.com", "password": "password123" });
    client.post(format!("{}/api/v1/auth/register", &app.address))
        .json(&register_body)
        .send()
        .await
        .expect("Setup: Failed to register user for token test.");

    let login_body = json!({ "email": "test@example.com", "password": "password123" });
    let login_response = client.post(format!("{}/api/v1/auth/login", &app.address))
        .json(&login_body)
        .send()
        .await
        .expect("Setup: Failed to log in to get token.");

    let login_json: Value = login_response.json().await.expect("Login response should be JSON.");
    let token = login_json["token"].as_str().expect("Login JSON should have a 'token' field.");

    // Act
    let response = client
        .get(format!("{}/api/v1/protected", &app.address))
        .bearer_auth(token)
        .send()
        .await
        .expect("Failed to send request to protected route.");

    // Assert
    assert_eq!(response.status().as_u16(), 200);
}

#[tokio::test(flavor = "multi_thread", worker_threads = 1)]
async fn protected_route_fails_without_token() {
    // Arrange
    let app = spawn_app().await;
    let client = Client::new();

    // Act
    let response = client
        .get(format!("{}/api/v1/protected", &app.address))
        .send()
        .await
        .expect("Failed to send request to protected route.");

    // Assert
    assert_eq!(response.status().as_u16(), 401);
}