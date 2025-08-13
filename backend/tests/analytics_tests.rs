mod common;

use crate::common::spawn_app;
use backend::analytics::models::AnalyticsResponse;
use chrono::{Duration, Utc};
use reqwest::Client;
use serde_json::json;
use rand::seq::IndexedRandom; 
use rand::Rng;

const PHYSICAL_TASK_NAMES: &[&str] = &["Train with the Survey Corps", "Clean the Barracks", "Run the Wall", "Titan Slaying Practice", "Carry Supplies"];
const MENTAL_TASK_NAMES: &[&str] = &["Strategize with Erwin", "Study Titan Weaknesses", "Read Ancient Texts", "Debrief with Hange", "Analyze Battle Reports"];


#[tokio::test(flavor = "multi_thread", worker_threads = 1)]
async fn get_analytics_returns_correctly_aggregated_data() {
    let app = spawn_app().await;
    let client = Client::new();
    let user = app.create_user_and_login("analyticstester", "analytics@test.com").await;
    let mut rng = rand::rng();

    let physical_tasks: Vec<_> = (0..5).map(|i| {
        let name = PHYSICAL_TASK_NAMES.choose(&mut rng).unwrap();
        
        json!({"name": name, "points": rng.random_range(5..=20), "category": "Physical", "is_mandatory": i < 2})
    }).collect();
    
    let mental_tasks: Vec<_> = (0..5).map(|i| {
        let name = MENTAL_TASK_NAMES.choose(&mut rng).unwrap();
        
        json!({"name": name, "points": rng.random_range(5..=20), "category": "Mental", "is_mandatory": i < 2})
    }).collect();

    let mut all_tasks = Vec::new();
    for task_body in physical_tasks.iter().chain(mental_tasks.iter()) {
        let res = client.post(format!("{}/api/v1/tasks", &app.address)).bearer_auth(&user.token).json(task_body).send().await.unwrap();
        all_tasks.push(res.json().await.unwrap());
    }

    // Simulate entries for the past 365 days
    let today = Utc::now().date_naive();
    let mut expected_physical_points = 0;
    let mut expected_mental_points = 0;
    let mut expected_today_points = 0;

    for i in 0..365 {
        let date = today - Duration::days(i as i64);
        
        if rng.random_bool(0.8) {
            
            let num_entries_today = rng.random_range(1..=4);
            for _ in 0..num_entries_today {
                let task: &serde_json::Value = all_tasks.choose(&mut rng).unwrap(); 
                let points = task["points"].as_i64().unwrap();
                
                let res = client.post(format!("{}/api/v1/entries", &app.address)).bearer_auth(&user.token)
                    .json(&json!({"taskId": task["id"], "date": date.to_string()})).send().await.unwrap();
                assert!(res.status().is_success(), "Failed to create entry for date {}", date);

                if task["category"].as_str().unwrap() == "Physical" { expected_physical_points += points; }
                else { expected_mental_points += points; }

                if i == 0 { expected_today_points += points; }
            }
        }
    }
    
    let user_row = sqlx::query!("SELECT total_points, current_streak, longest_streak FROM users WHERE id = $1", user.id)
        .fetch_one(&app.db_pool).await.unwrap();
    let expected_total_points = user_row.total_points;


    // Act: Call the analytics endpoint
    let response = client
        .get(format!("{}/api/v1/analytics?range=monthly", &app.address))
        .bearer_auth(&user.token)
        .send()
        .await
        .unwrap();

    // Assert
    assert_eq!(response.status().as_u16(), 200);
    let analytics: AnalyticsResponse = response.json().await.unwrap();

    assert_eq!(analytics.total_points, expected_total_points);
    assert_eq!(analytics.today_points, expected_today_points);
    assert_eq!(analytics.streaks.current, user_row.current_streak);
    assert_eq!(analytics.streaks.longest, user_row.longest_streak);
    assert_eq!(analytics.category_breakdown.physical, expected_physical_points);
    assert_eq!(analytics.category_breakdown.mental, expected_mental_points);
    assert!(analytics.points_chart_data.len() <= 30);
    assert!(analytics.heatmap_data.len() > 200, "Expected a significant amount of heatmap data after a year of simulation.");
    assert_eq!(analytics.user_level.total_xp, expected_total_points);
}