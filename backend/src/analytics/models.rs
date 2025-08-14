// backend/src/analytics/models.rs
use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

// --- Badge Models ---
#[derive(Debug, Serialize,Deserialize, Clone, sqlx::Type)]
#[sqlx(type_name = "badge_material_tier", rename_all = "PascalCase")]
pub enum BadgeMaterialTier {
    Coal, Iron, Bronze, Silver, Gold, Platinum, Diamond,
}
#[derive(Debug, Serialize,Deserialize, Clone, sqlx::Type)]
#[sqlx(type_name = "badge_rank_tier", rename_all = "PascalCase")]
pub enum BadgeRankTier {
    Mortal, Aspirant, Demigod, God, Titan,
}
#[derive(Debug, Serialize,Deserialize, Clone, sqlx::Type)]
#[sqlx(type_name = "badge_focus_factor", rename_all = "PascalCase")]
pub enum BadgeFocusFactor {
    Consistency, Volume, Mental, Physical, Dedication, Ambition,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct EarnedBadge {
    pub id: Uuid,
    pub user_id: Uuid,
    pub material_tier: BadgeMaterialTier,
    pub rank_tier: BadgeRankTier,
    pub focus_factor: BadgeFocusFactor,
    pub threshold: i32,
    pub unlocked_at: DateTime<Utc>,
}


// --- Component Models for the Final Response ---
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Streaks {
    pub current: i32,
    pub longest: i32,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UserLevel {
    pub level: i64,
    pub current_xp: i64,
    pub xp_to_next_level: i64,
    pub total_xp: i64,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChartDataPoint {
    pub label: String,
    pub value: i64,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HeatmapDay {
    pub date: NaiveDate,
    pub activity: i32, // 0-4 scale for intensity
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CategoryBreakdown {
    pub physical: i64,
    pub mental: i64,
}

// The final, complete response object, matching frontend/src/types/index.ts
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AnalyticsResponse {
    pub streaks: Streaks,
    pub points_chart_data: Vec<ChartDataPoint>,
    pub heatmap_data: Vec<HeatmapDay>,
    pub category_breakdown: CategoryBreakdown,
    pub user_level: UserLevel,
    pub badges: Vec<EarnedBadge>,
    pub weekly_average: f64,
    pub total_points: i64,
    pub today_points: i64,

    pub previous_period_points: i64,
    pub prev_weekly_average: f64, 
}

// Query parameter for the time range
#[derive(Debug, Deserialize)]
pub struct AnalyticsQuery {
    #[serde(default = "default_range")]
    pub range: String,
}

fn default_range() -> String {
    "monthly".to_string()
}