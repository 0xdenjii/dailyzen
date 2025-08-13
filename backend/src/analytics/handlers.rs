// backend/src/analytics/handlers.rs
use crate::auth::AuthUser;
use crate::errors::AppError;
use crate::state::AppState;
use crate::analytics::models::{
    AnalyticsQuery, AnalyticsResponse, CategoryBreakdown, ChartDataPoint, EarnedBadge, HeatmapDay,
    Streaks, UserLevel,
};
use axum::{
    extract::{Query, State},
    response::IntoResponse,
    Json,
};
use chrono::{Duration, Utc};
use futures::try_join;

const XP_PER_LEVEL: i64 = 500;

pub async fn get_analytics_handler(
    State(state): State<AppState>,
    AuthUser(user_id): AuthUser,
    Query(query): Query<AnalyticsQuery>,
) -> Result<impl IntoResponse, AppError> {
    
    // --- Determine Date Range ---
    let today = Utc::now().date_naive();
    let days_in_range = match query.range.as_str() {
        "weekly" => 7,
        "yearly" => 365,
        _ => 30, // "monthly" or default
    };
    let start_date = today - Duration::days(days_in_range - 1);
    let seven_days_ago = today - Duration::days(6);

    // --- Execute Queries in Parallel ---
    let user_future = sqlx::query!(
        "SELECT total_points, current_streak, longest_streak FROM users WHERE id = $1",
        user_id
    )
    .fetch_one(&state.db_pool);

    let weekly_average_future = sqlx::query!(
        r#"
        SELECT AVG(daily_total)::FLOAT8 as average
        FROM (
            SELECT SUM(points_awarded) as daily_total
            FROM entries
            WHERE user_id = $1 AND date >= $2 AND date <= $3
            GROUP BY date
        ) as daily_sums
        "#,
        user_id,
        seven_days_ago,
        today
    ).fetch_one(&state.db_pool);


    let points_chart_future = sqlx::query_as!(
        ChartDataPoint,
        r#"
        SELECT 
            to_char(date, 'Mon DD') as "label!", 
            SUM(points_awarded)::BIGINT as "value!"
        FROM entries
        WHERE user_id = $1 AND date >= $2
        GROUP BY date
        ORDER BY date ASC
        "#,
        user_id,
        start_date
    )
    .fetch_all(&state.db_pool);

    let category_breakdown_future = sqlx::query_as!(
        CategoryBreakdown,
        r#"
        SELECT
            COALESCE(SUM(e.points_awarded) FILTER (WHERE t.category = 'Physical'), 0)::BIGINT AS "physical!",
            COALESCE(SUM(e.points_awarded) FILTER (WHERE t.category = 'Mental'), 0)::BIGINT AS "mental!"
        FROM entries e
        JOIN tasks t ON e.task_id = t.id
        WHERE e.user_id = $1
        "#,
        user_id
    )
    .fetch_one(&state.db_pool);

    let badges_future = sqlx::query_as::<_, EarnedBadge>("SELECT * FROM badges WHERE user_id = $1 ORDER BY unlocked_at DESC")
        .bind(user_id)
        .fetch_all(&state.db_pool);
        
    let heatmap_future = sqlx::query!(
        r#"
        SELECT date, SUM(points_awarded)::INT as points FROM entries
        WHERE user_id = $1 AND date >= $2
        GROUP BY date
        "#,
        user_id,
        today - Duration::days(365)
    )
    .fetch_all(&state.db_pool);

    let today_points_future = sqlx::query!(
        "SELECT COALESCE(SUM(points_awarded), 0)::BIGINT as total FROM entries WHERE user_id = $1 AND date = $2",
        user_id,
        today
    )
    .fetch_one(&state.db_pool);


    // Await all futures concurrently
    let (
        user_data,
        points_chart_data,
        category_breakdown_result,
        badges,
        heatmap_points,
        today_points_result,
        weekly_average_result 
    ) = try_join!(
        user_future,
        points_chart_future,
        category_breakdown_future,
        badges_future,
        heatmap_future,
        today_points_future,
        weekly_average_future 
    )?;
    
    // --- Process and Assemble the Data ---
    
    let streaks = Streaks {
        current: user_data.current_streak,
        longest: user_data.longest_streak,
    };

    let total_points = user_data.total_points;
    let user_level = UserLevel {
        total_xp: total_points,
        level: (total_points / XP_PER_LEVEL) + 1,
        current_xp: total_points % XP_PER_LEVEL,
        xp_to_next_level: XP_PER_LEVEL - (total_points % XP_PER_LEVEL),
    };

    let category_breakdown = category_breakdown_result;
    let today_points = today_points_result.total.unwrap_or(0);
    
let weekly_average = weekly_average_result.average.unwrap_or(0.0);
    // Process heatmap data to get activity level
    let heatmap_data: Vec<HeatmapDay> = heatmap_points.into_iter().map(|row| {
        let points = row.points.unwrap_or(0);
        let activity = match points {
            p if p <= 0 => 0,
            p if p <= 10 => 1,
            p if p <= 25 => 2,
            p if p <= 50 => 3,
            _ => 4,
        };
        HeatmapDay { date: row.date, activity }
    }).collect();

    let response = AnalyticsResponse {
        streaks,
        points_chart_data,
        heatmap_data,
        category_breakdown,
        user_level,
        badges,
        weekly_average,
        total_points,
        today_points,
    };
    
    Ok(Json(response))
}