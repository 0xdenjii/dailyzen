mod common;

use crate::common::spawn_app;
use backend::goals::models::Goal;
use chrono::NaiveDate;
use reqwest::Client;
use serde_json::json;

#[tokio::test(flavor = "multi_thread", worker_threads = 1)]
async fn create_goal_succeeds_with_valid_data() {
    // Arrange
    let app = spawn_app().await;
    let client = Client::new();
    let user = app.create_user_and_login("user1", "user1@test.com").await;

    let deadline = NaiveDate::from_ymd_opt(2026, 12, 31).unwrap();
    let body = json!({
        "description": "Run a full marathon",
        "category": "Physical",
        "deadline": deadline.to_string(),
        "penalty": 100
    });

    // Act
    let response = client
        .post(format!("{}/api/v1/goals", &app.address))
        .bearer_auth(&user.token)
        .json(&body)
        .send()
        .await
        .expect("Failed to execute request.");

    // Assert
    assert_eq!(response.status().as_u16(), 201);

    let saved_goal = sqlx::query_as!(
        Goal,
        r#"
        SELECT 
            id, user_id, description, category as "category: _", 
            deadline, penalty, progress, is_completed, created_at, updated_at
        FROM goals
        "#
    )
    .fetch_one(&app.db_pool)
    .await
    .expect("Failed to fetch saved goal.");

    assert_eq!(saved_goal.description, "Run a full marathon");
    assert_eq!(saved_goal.user_id, user.id);
    assert!(!saved_goal.is_completed); 
}


#[tokio::test(flavor = "multi_thread", worker_threads = 1)]
async fn get_goals_returns_only_owned_goals() {
    // Arrange
    let app = spawn_app().await;
    let client = Client::new();
    let user1 = app.create_user_and_login("user1", "user1@test.com").await;
    let user2 = app.create_user_and_login("user2", "user2@test.com").await;
    let deadline = NaiveDate::from_ymd_opt(2026, 1, 1).unwrap().to_string();

    // User 1 creates a goal
    client.post(format!("{}/api/v1/goals", &app.address)).bearer_auth(&user1.token)
        .json(&json!({"description": "Goal by User 1", "category": "Personal", "deadline": deadline, "penalty": 0}))
        .send().await.unwrap();

    // User 2 creates a goal
    client.post(format!("{}/api/v1/goals", &app.address)).bearer_auth(&user2.token)
        .json(&json!({"description": "Goal by User 2", "category": "Career", "deadline": deadline, "penalty": 0}))
        .send().await.unwrap();

    // Act: User 1 fetches their goals
    let response = client.get(format!("{}/api/v1/goals", &app.address))
        .bearer_auth(&user1.token)
        .send()
        .await
        .unwrap();

    // Assert
    assert_eq!(response.status().as_u16(), 200);
    let goals: Vec<Goal> = response.json().await.unwrap();
    assert_eq!(goals.len(), 1);
    assert_eq!(goals[0].description, "Goal by User 1");
}

#[tokio::test(flavor = "multi_thread", worker_threads = 1)]
async fn update_goal_progress_succeeds_and_marks_complete_at_100() {
    // Arrange
    let app = spawn_app().await;
    let client = Client::new();
    let user = app.create_user_and_login("user1", "user1@test.com").await;
    let deadline = NaiveDate::from_ymd_opt(2026, 1, 1).unwrap().to_string();

    // Create the initial goal
    let create_response = client.post(format!("{}/api/v1/goals", &app.address)).bearer_auth(&user.token)
        .json(&json!({"description": "Learn Rust", "category": "Career", "deadline": deadline, "penalty": 50}))
        .send().await.unwrap();
    let goal: Goal = create_response.json().await.unwrap();
    assert_eq!(goal.progress, 0);
    assert!(!goal.is_completed);

    // Act: Update progress to 100
    let update_response = client.put(format!("{}/api/v1/goals/{}", &app.address, goal.id))
        .bearer_auth(&user.token)
        .json(&json!({ "progress": 100 }))
        .send().await.unwrap();

    // Assert
    assert_eq!(update_response.status().as_u16(), 200);
    let updated_goal: Goal = update_response.json().await.unwrap();
    assert_eq!(updated_goal.progress, 100);
    assert!(updated_goal.is_completed); // Verify is_completed is now true
}

#[tokio::test(flavor = "multi_thread", worker_threads = 1)]
async fn update_goal_fails_for_other_users_goal() {
    // Arrange
    let app = spawn_app().await;
    let client = Client::new();
    let user1 = app.create_user_and_login("user1", "user1@test.com").await;
    let user2 = app.create_user_and_login("user2", "user2@test.com").await;
    let deadline = NaiveDate::from_ymd_opt(2026, 1, 1).unwrap().to_string();

    // User 1 creates a goal
    let create_response = client.post(format!("{}/api/v1/goals", &app.address)).bearer_auth(&user1.token)
        .json(&json!({"description": "User 1's secret goal", "category": "Personal", "deadline": deadline, "penalty": 0}))
        .send().await.unwrap();
    let goal_to_update: Goal = create_response.json().await.unwrap();

    // Act: User 2 tries to update User 1's goal
    let response = client.put(format!("{}/api/v1/goals/{}", &app.address, goal_to_update.id))
        .bearer_auth(&user2.token) // Note: using User 2's token
        .json(&json!({ "progress": 50 }))
        .send().await.unwrap();
    
    // Assert
    assert_eq!(response.status().as_u16(), 404); // Not Found is correct, as the goal doesn't exist for this user
}

#[tokio::test(flavor = "multi_thread", worker_threads = 1)]
async fn delete_goal_succeeds_for_owned_goal() {
    // Arrange
    let app = spawn_app().await;
    let client = Client::new();
    let user = app.create_user_and_login("user1", "user1@test.com").await;
    let deadline = NaiveDate::from_ymd_opt(2026, 1, 1).unwrap().to_string();
    
    // Create a goal to delete
    let create_response = client.post(format!("{}/api/v1/goals", &app.address)).bearer_auth(&user.token)
        .json(&json!({"description": "A temporary goal", "category": "Personal", "deadline": deadline, "penalty": 0}))
        .send().await.unwrap();
    let created_goal: Goal = create_response.json().await.unwrap();

    // Act
    let delete_response = client
        .delete(format!("{}/api/v1/goals/{}", &app.address, created_goal.id))
        .bearer_auth(&user.token)
        .send()
        .await
        .unwrap();
    
    // Assert
    assert_eq!(delete_response.status().as_u16(), 204);
    let count = sqlx::query!("SELECT count(*) FROM goals WHERE id = $1", created_goal.id)
        .fetch_one(&app.db_pool)
        .await
        .unwrap()
        .count
        .unwrap();
    assert_eq!(count, 0);
}