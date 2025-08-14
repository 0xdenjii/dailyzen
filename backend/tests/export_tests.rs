mod common; 


use crate::common::spawn_app;
use backend::export::models::UserDataExport;
use chrono::Utc;
use reqwest::Client;
use serde_json::json;

#[tokio::test(flavor = "multi_thread", worker_threads = 1)]
async fn export_data_returns_all_user_information() {
    // Arrange: Create a user and populate every type of data for them.
    let app = spawn_app().await;
    let client = Client::new();
    let user = app.create_user_and_login("export_user", "export@test.com").await;

    let today = Utc::now().date_naive().to_string();

    // 1. Create a Task
    let task_res = client.post(format!("{}/api/v1/tasks", &app.address)).bearer_auth(&user.token)
        .json(&json!({"name": "Export Task", "points": 10, "category": "Mental", "isMandatory": false}))
        .send().await.unwrap();
    let task: serde_json::Value = task_res.json().await.unwrap();

    // 2. Create an Entry for that task
    client.post(format!("{}/api/v1/entries", &app.address)).bearer_auth(&user.token)
        .json(&json!({"taskId": task["id"], "date": today}))
        .send().await.unwrap();

    // 3. Create a Goal
    client.post(format!("{}/api/v1/goals", &app.address)).bearer_auth(&user.token)
        .json(&json!({"description": "Test Export Goal", "category": "Personal", "deadline": today, "penalty": 0}))
        .send().await.unwrap();

    // 4. Create a Note
    client.post(format!("{}/api/v1/notes", &app.address)).bearer_auth(&user.token)
        .json(&json!({"date": today, "content": "Export test note", "mood": 4}))
        .send().await.unwrap();

    // 5. Manually insert a Badge (since they are awarded by the cron job)
    sqlx::query!(
        r#"
        INSERT INTO badges (user_id, material_tier, rank_tier, focus_factor, threshold)
        VALUES ($1, 'Bronze', 'Aspirant', 'Volume', 1000)
        "#,
        user.id
    ).execute(&app.db_pool).await.unwrap();

    // Act: Call the export endpoint
    let response = client
        .get(format!("{}/api/v1/export", &app.address))
        .bearer_auth(&user.token)
        .send()
        .await
        .unwrap();

    // Assert
    assert_eq!(response.status().as_u16(), 200);

    // Check for the download header
    assert!(response.headers().contains_key("content-disposition"));
    assert!(response.headers()["content-disposition"].to_str().unwrap().contains("attachment; filename="));

    let export_data: UserDataExport = response.json().await.unwrap();

    // Verify the contents of the export
    assert_eq!(export_data.export_metadata.user_id, user.id);
    assert_eq!(export_data.tasks.len(), 1);
    assert_eq!(export_data.tasks[0].name, "Export Task");

    assert_eq!(export_data.entries.len(), 1);
    assert_eq!(export_data.entries[0].points_awarded, 10);

    assert_eq!(export_data.goals.len(), 1);
    assert_eq!(export_data.goals[0].description, "Test Export Goal");

    assert_eq!(export_data.notes.len(), 1);
    assert_eq!(export_data.notes[0].content, Some("Export test note".to_string()));

    assert_eq!(export_data.badges.len(), 1);
    assert_eq!(export_data.badges[0].threshold, 1000);
}