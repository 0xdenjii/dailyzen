mod common;

use crate::common::spawn_app;
use backend::jobs::daily_check::perform_daily_check;
use chrono::{Duration, Utc};


#[tokio::test(flavor = "multi_thread", worker_threads = 1)]
async fn daily_check_handles_streaks_penalties_and_badges_correctly() {
    // --- ARRANGE ---
    let app = spawn_app().await;
    let yesterday = (Utc::now() - Duration::days(1)).date_naive();
    let two_days_ago = (Utc::now() - Duration::days(2)).date_naive();

    // SCENARIO 1: User A - Continued Streak, No Penalty
    let user_a = app.create_user_and_login("userA", "a@test.com").await;
    let task_a = app.create_mandatory_task(&user_a.token, "Task A", 10).await;
    // Manually set a pre-existing streak
    sqlx::query!("UPDATE users SET current_streak = 3, longest_streak = 3, last_entry_date = $1 WHERE id = $2", yesterday, user_a.id)
        .execute(&app.db_pool).await.unwrap();
    // This user *did* complete their mandatory task yesterday, so they should not be penalized.
    app.create_entry_for_date(&user_a.token, task_a.id, &yesterday.to_string()).await;

    // SCENARIO 2: User B - Broken Streak, Penalty Applied
    let user_b = app.create_user_and_login("userB", "b@test.com").await;
    app.create_mandatory_task(&user_b.token, "Task B", 20).await;
    // This user's last activity was two days ago, so their streak is broken.
    sqlx::query!("UPDATE users SET current_streak = 5, longest_streak = 5, total_points = 100, last_entry_date = $1 WHERE id = $2", two_days_ago, user_b.id)
        .execute(&app.db_pool).await.unwrap();

    // SCENARIO 3: User C - Badge Awarded
    let user_c = app.create_user_and_login("userC", "c@test.com").await;
    // This user has a 6-day streak and was active yesterday. The job will push them to 7.
    sqlx::query!("UPDATE users SET current_streak = 6, longest_streak = 6, last_entry_date = $1 WHERE id = $2", yesterday, user_c.id)
        .execute(&app.db_pool).await.unwrap();

    // --- ACT ---
    // Manually run the core logic of the cron job for the entire system.
    perform_daily_check(&app.db_pool).await.expect("Daily check logic failed to run");

    // --- ASSERT ---

    // Assert User A's outcome
    let user_a_record = sqlx::query!("SELECT current_streak, longest_streak, total_points FROM users WHERE id = $1", user_a.id)
        .fetch_one(&app.db_pool).await.unwrap();
    assert_eq!(user_a_record.current_streak, 4, "User A's streak should have incremented.");
    assert_eq!(user_a_record.longest_streak, 4, "User A's longest streak should have updated.");
    // Points are updated by the entry creation, so we verify it's not the penalty value.
    assert_eq!(user_a_record.total_points, 10, "User A should have points from their entry, not a penalty.");

    // Assert User B's outcome
    let user_b_record = sqlx::query!("SELECT current_streak, longest_streak, total_points FROM users WHERE id = $1", user_b.id)
        .fetch_one(&app.db_pool).await.unwrap();
    assert_eq!(user_b_record.current_streak, 0, "User B's streak should be reset to 0.");
    assert_eq!(user_b_record.longest_streak, 5, "User B's longest streak should remain unchanged.");
    assert_eq!(user_b_record.total_points, 80, "User B should have a 20-point penalty applied (100 - 20).");

    // Assert User C's outcome
    let user_c_record = sqlx::query!("SELECT current_streak FROM users WHERE id = $1", user_c.id)
        .fetch_one(&app.db_pool).await.unwrap();
    assert_eq!(user_c_record.current_streak, 7, "User C's streak should have incremented to 7.");
    let badge_count = sqlx::query!("SELECT count(*) FROM badges WHERE user_id = $1 AND focus_factor = 'Consistency' AND threshold = 7", user_c.id)
        .fetch_one(&app.db_pool).await.unwrap().count.unwrap();
    assert_eq!(badge_count, 1, "User C should have been awarded the 7-day streak badge.");
}