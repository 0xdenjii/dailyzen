mod common;

use crate::common::{spawn_app};
use backend::notes::models::Note;
use chrono::{Utc};
use reqwest::Client;
use serde_json::json;

// Helper to quickly create a note for a specific date
async fn create_note(app: &common::TestApp, token: &str, date: &str, content: &str, mood: i16) {
    let client = Client::new();
    let response = client
        .post(format!("{}/api/v1/notes", &app.address))
        .bearer_auth(token)
        .json(&json!({
            "date": date,
            "content": content,
            "mood": mood
        }))
        .send()
        .await
        .unwrap();
    assert_eq!(response.status().as_u16(), 200);
}

#[tokio::test(flavor = "multi_thread", worker_threads = 1)]
async fn upsert_note_creates_a_new_note() {
    // Arrange
    let app = spawn_app().await;
    let user = app.create_user_and_login("user1", "user1@test.com").await;
    let client = Client::new();
    let today_str = Utc::now().format("%Y-%m-%d").to_string();

    // Act
    let body = json!({
        "date": today_str,
        "content": "Today was a productive day.",
        "mood": 5
    });
    let response = client
        .post(format!("{}/api/v1/notes", &app.address))
        .bearer_auth(&user.token)
        .json(&body)
        .send()
        .await
        .unwrap();

    // Assert
    assert_eq!(response.status().as_u16(), 200);
    let note: Note = response.json().await.unwrap();
    assert_eq!(note.content, Some("Today was a productive day.".to_string()));
    assert_eq!(note.mood, Some(5));

    let saved_note = sqlx::query_as!(Note, "SELECT id, user_id, date, content, mood, created_at, updated_at FROM notes WHERE user_id = $1", user.id)
        .fetch_one(&app.db_pool).await.unwrap();
    assert_eq!(saved_note.id, note.id);
}

#[tokio::test(flavor = "multi_thread", worker_threads = 1)]
async fn upsert_note_updates_an_existing_note() {
    // Arrange
    let app = spawn_app().await;
    let user = app.create_user_and_login("user1", "user1@test.com").await;
    let client = Client::new();
    let today_str = Utc::now().format("%Y-%m-%d").to_string();

    // Create the initial note
    create_note(&app, &user.token, &today_str, "Initial thoughts.", 3).await;

    // Act: Update the note for the same day
    let body = json!({
        "date": today_str,
        "content": "Updated content after reflection.",
        "mood": 4
    });
    let response = client.post(format!("{}/api/v1/notes", &app.address))
        .bearer_auth(&user.token).json(&body).send().await.unwrap();

    // Assert
    assert_eq!(response.status().as_u16(), 200);
    let note: Note = response.json().await.unwrap();
    assert_eq!(note.content, Some("Updated content after reflection.".to_string()));
    assert_eq!(note.mood, Some(4));

    // Ensure there is still only one note for that day
    let count = sqlx::query!("SELECT count(*) FROM notes WHERE user_id = $1", user.id)
        .fetch_one(&app.db_pool).await.unwrap().count.unwrap();
    assert_eq!(count, 1);
}

#[tokio::test(flavor = "multi_thread", worker_threads = 1)]
async fn get_note_by_date_returns_note_or_null() {
    // Arrange
    let app = spawn_app().await;
    let user = app.create_user_and_login("user1", "user1@test.com").await;
    let client = Client::new();
    let today_str = Utc::now().format("%Y-%m-%d").to_string();
    let yesterday_str = (Utc::now() - chrono::Duration::days(1)).format("%Y-%m-%d").to_string();
    create_note(&app, &user.token, &today_str, "A note for today.", 5).await;

    // Act 1: Get existing note
    let response1 = client.get(format!("{}/api/v1/notes?date={}", &app.address, today_str))
        .bearer_auth(&user.token).send().await.unwrap();
    
    // Assert 1
    assert_eq!(response1.status().as_u16(), 200);
    let note1: Note = response1.json().await.unwrap();
    assert_eq!(note1.content, Some("A note for today.".to_string()));

    // Act 2: Get non-existent note
    let response2 = client.get(format!("{}/api/v1/notes?date={}", &app.address, yesterday_str))
        .bearer_auth(&user.token).send().await.unwrap();

    // Assert 2
    assert_eq!(response2.status().as_u16(), 200);
    let note2: Option<Note> = response2.json().await.unwrap();
    assert!(note2.is_none()); // Should be JSON `null`
}


#[tokio::test(flavor = "multi_thread", worker_threads = 1)]
async fn get_recent_notes_returns_correctly_ordered_list() {
    // Arrange
    let app = spawn_app().await;
    let user = app.create_user_and_login("user1", "user1@test.com").await;
    let client = Client::new();

    // Create notes for the last 3 days
    let today_str = Utc::now().format("%Y-%m-%d").to_string();
    let yesterday_str = (Utc::now() - chrono::Duration::days(1)).format("%Y-%m-%d").to_string();
    let day_before_str = (Utc::now() - chrono::Duration::days(2)).format("%Y-%m-%d").to_string();
    
    create_note(&app, &user.token, &day_before_str, "Oldest note", 2).await;
    create_note(&app, &user.token, &today_str, "Newest note", 5).await;
    create_note(&app, &user.token, &yesterday_str, "Middle note", 4).await;
    
    // Act
    let response = client.get(format!("{}/api/v1/notes/recent", &app.address))
        .bearer_auth(&user.token)
        .send()
        .await
        .unwrap();

    // Assert
    assert_eq!(response.status().as_u16(), 200);
    let notes: Vec<Note> = response.json().await.unwrap();
    assert_eq!(notes.len(), 3);
    // Verify they are in descending order by date
    assert_eq!(notes[0].content, Some("Newest note".to_string()));
    assert_eq!(notes[1].content, Some("Middle note".to_string()));
    assert_eq!(notes[2].content, Some("Oldest note".to_string()));
}
