use crate::analytics::models::{BadgeFocusFactor, BadgeMaterialTier, BadgeRankTier};
use crate::state::AppState;
use chrono::{Duration, NaiveDate, Utc};
use sqlx::PgPool;
use tracing::{info, warn};
use uuid::Uuid;

// --- COMPLETE Badge Threshold Definitions ---
const STREAK_THRESHOLDS: &[(i32, BadgeMaterialTier, BadgeRankTier)] = &[(7, BadgeMaterialTier::Bronze, BadgeRankTier::Aspirant), (30, BadgeMaterialTier::Silver, BadgeRankTier::Demigod), (100, BadgeMaterialTier::Gold, BadgeRankTier::God)];
const POINTS_THRESHOLDS: &[(i64, BadgeMaterialTier, BadgeRankTier)] = &[(1000, BadgeMaterialTier::Bronze, BadgeRankTier::Aspirant), (5000, BadgeMaterialTier::Silver, BadgeRankTier::Demigod), (25000, BadgeMaterialTier::Gold, BadgeRankTier::God)];
const MENTAL_POINTS_THRESHOLDS: &[(i64, BadgeMaterialTier, BadgeRankTier)] = &[(500, BadgeMaterialTier::Bronze, BadgeRankTier::Aspirant), (2500, BadgeMaterialTier::Silver, BadgeRankTier::Demigod)];
const PHYSICAL_POINTS_THRESHOLDS: &[(i64, BadgeMaterialTier, BadgeRankTier)] = &[(500, BadgeMaterialTier::Bronze, BadgeRankTier::Aspirant), (2500, BadgeMaterialTier::Silver, BadgeRankTier::Demigod)];
const NOTES_THRESHOLDS: &[(i64, BadgeMaterialTier, BadgeRankTier)] = &[(10, BadgeMaterialTier::Bronze, BadgeRankTier::Aspirant), (50, BadgeMaterialTier::Silver, BadgeRankTier::Demigod)];
const GOALS_THRESHOLDS: &[(i64, BadgeMaterialTier, BadgeRankTier)] = &[(1, BadgeMaterialTier::Bronze, BadgeRankTier::Aspirant), (5, BadgeMaterialTier::Silver, BadgeRankTier::Demigod)];


pub async fn job_runner(app_state: AppState) {
    info!("CRON JOB: Starting daily check job runner...");
    if let Err(e) = perform_daily_check(&app_state.db_pool).await {
        warn!("CRON JOB: Daily check failed with error: {}", e);
    }
    info!("CRON JOB: Finished daily check job runner.");
}


// This is the new, high-performance daily check orchestrator.
pub async fn perform_daily_check(db_pool: &PgPool) -> Result<(), sqlx::Error> {
    let yesterday = (Utc::now() - Duration::days(1)).date_naive();
    
    // Step 1 & 2: Atomically update all user streaks in a single query.
    update_all_streaks(db_pool, yesterday).await?;
    
    // Step 3: Apply penalties for all users in a single query.
    apply_all_penalties(db_pool, yesterday).await?;

    // Step 4: Evaluate and award badges for all users.
    evaluate_all_user_badges(db_pool).await?;
    
    Ok(())
}


async fn update_all_streaks(db: &PgPool, yesterday: NaiveDate) -> Result<(), sqlx::Error> {
    info!("CRON JOB: Updating streaks for all users...");
    // This single, powerful query handles all streak logic for every user at once.
    let result = sqlx::query!(
        r#"
        UPDATE users
        SET 
            current_streak = CASE
                -- If last entry was yesterday, increment the streak.
                WHEN last_entry_date = $1 THEN current_streak + 1
                -- Otherwise, the streak is broken and resets to 0.
                ELSE 0
            END,
            longest_streak = GREATEST(longest_streak, CASE
                WHEN last_entry_date = $1 THEN current_streak + 1
                ELSE 0
            END)
        "#,
        yesterday
    ).execute(db).await?;
    info!("CRON JOB: Streaks updated for {} users.", result.rows_affected());
    Ok(())
}

async fn apply_all_penalties(db: &PgPool, yesterday: NaiveDate) -> Result<(), sqlx::Error> {
    info!("CRON JOB: Applying penalties for all users...");
    // This CTE-based query finds all missed mandatory tasks for all users
    // and applies the total penalty in a single UPDATE statement.
    let result = sqlx::query!(
        r#"
        WITH missed_tasks AS (
            SELECT 
                t.user_id,
                SUM(-t.points) AS total_penalty
            FROM tasks t
            WHERE t.is_mandatory = true
            AND NOT EXISTS (
                SELECT 1 FROM entries e
                WHERE e.user_id = t.user_id
                AND e.task_id = t.id
                AND e.date = $1
            )
            GROUP BY t.user_id
        )
        UPDATE users u
        SET total_points = u.total_points + mt.total_penalty
        FROM missed_tasks mt
        WHERE u.id = mt.user_id
        "#,
        yesterday
    ).execute(db).await?;
    info!("CRON JOB: Penalties applied to {} users.", result.rows_affected());
    Ok(())
}

#[derive(sqlx::FromRow)]
struct UserStats {
    user_id: Uuid,
    total_points: i64,
    current_streak: i32,
    mental_points: i64,
    physical_points: i64,
    notes_count: i64,
    goals_completed: i64,
}


async fn evaluate_all_user_badges(db: &PgPool) -> Result<(), sqlx::Error> {
    info!("CRON JOB: Evaluating badges for all users...");
    // This one large query fetches all necessary stats for every user at once.
    let all_stats: Vec<UserStats> = sqlx::query_as(
        r#"
        SELECT
            u.id as user_id,
            u.total_points,
            u.current_streak,
            COALESCE(cat_points.mental, 0) as mental_points,
            COALESCE(cat_points.physical, 0) as physical_points,
            COALESCE(notes.count, 0) as notes_count,
            COALESCE(goals.count, 0) as goals_completed
        FROM users u
        LEFT JOIN (
            SELECT
                e.user_id,
                SUM(e.points_awarded) FILTER (WHERE t.category = 'Mental') AS mental,
                SUM(e.points_awarded) FILTER (WHERE t.category = 'Physical') AS physical
            FROM entries e JOIN tasks t ON e.task_id = t.id
            GROUP BY e.user_id
        ) AS cat_points ON u.id = cat_points.user_id
        LEFT JOIN (
            SELECT user_id, COUNT(*) as count FROM notes GROUP BY user_id
        ) AS notes ON u.id = notes.user_id
        LEFT JOIN (
            SELECT user_id, COUNT(*) as count FROM goals WHERE is_completed = true GROUP BY user_id
        ) AS goals ON u.id = goals.user_id
        "#
    ).fetch_all(db).await?;

    // Now, we iterate over the fetched data in Rust.
    for stats in all_stats {
        let mut tx = db.begin().await?;
        check_and_award_badges(&mut tx, stats.user_id, &stats).await;
        tx.commit().await?;
    }
    Ok(())
}



async fn check_and_award_badges(tx: &mut sqlx::Transaction<'_, sqlx::Postgres>, user_id: Uuid, stats: &UserStats) {
    for &(t, ref m, ref r) in STREAK_THRESHOLDS { if stats.current_streak >= t { award_badge(tx, user_id, m.clone(), r.clone(), BadgeFocusFactor::Consistency, t).await; }}
    for &(t, ref m, ref r) in POINTS_THRESHOLDS { if stats.total_points >= t { award_badge(tx, user_id, m.clone(), r.clone(), BadgeFocusFactor::Volume, t as i32).await; }}
    for &(t, ref m, ref r) in MENTAL_POINTS_THRESHOLDS { if stats.mental_points >= t { award_badge(tx, user_id, m.clone(), r.clone(), BadgeFocusFactor::Mental, t as i32).await; }}
    for &(t, ref m, ref r) in PHYSICAL_POINTS_THRESHOLDS { if stats.physical_points >= t { award_badge(tx, user_id, m.clone(), r.clone(), BadgeFocusFactor::Physical, t as i32).await; }}
    for &(t, ref m, ref r) in NOTES_THRESHOLDS { if stats.notes_count >= t { award_badge(tx, user_id, m.clone(), r.clone(), BadgeFocusFactor::Dedication, t as i32).await; }}
    for &(t, ref m, ref r) in GOALS_THRESHOLDS { if stats.goals_completed >= t { award_badge(tx, user_id, m.clone(), r.clone(), BadgeFocusFactor::Ambition, t as i32).await; }}
}

async fn award_badge(tx: &mut sqlx::Transaction<'_, sqlx::Postgres>, user_id: Uuid, material: BadgeMaterialTier, rank: BadgeRankTier, focus: BadgeFocusFactor, threshold: i32) {
    let result = sqlx::query!(
        r#"
        INSERT INTO badges (user_id, material_tier, rank_tier, focus_factor, threshold)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (user_id, focus_factor) DO UPDATE SET
            material_tier = EXCLUDED.material_tier,
            rank_tier = EXCLUDED.rank_tier,
            threshold = EXCLUDED.threshold,
            unlocked_at = NOW()
        -- This WHERE clause is critical: it ensures we only update if the new badge's
        -- threshold is strictly greater than the one they already have.
        WHERE badges.threshold < EXCLUDED.threshold
        "#,
        user_id, material as _, rank as _, focus as _, threshold
    ).execute(&mut **tx).await;
    
    if let Ok(res) = result {
        if res.rows_affected() > 0 {
            info!("Awarded or upgraded badge ({:?}, {:?}, {:?}) for user {}", material, rank, focus, user_id);
        }
    }
}
