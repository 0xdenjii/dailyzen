use serde::{Deserialize, Serialize};
use validator::Validate;
use uuid::Uuid;
use chrono::{DateTime, NaiveDate, Utc};

// The complete User model, mapping to the database table
#[derive(Debug, Serialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct User {
    pub id: Uuid,
    pub username: String,
    pub email: String,
    #[serde(skip_serializing)] 
    pub password_hash: String,
    pub total_points: i64,
    pub current_streak: i32,
    pub longest_streak: i32,
    pub last_entry_date: Option<NaiveDate>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

// A public-safe version of the User model
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UserPublic {
    pub id: Uuid,
    pub username: String,
    pub email: String,
    pub total_points: i64,
    pub current_streak: i32,
    pub longest_streak: i32,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize, Validate)]
pub struct RegisterUser {
    #[validate(length(min = 3, message = "Username must be at least 3 characters long"))]
    pub username: String,
    #[validate(email(message = "Must be a valid email"))]
    pub email: String,
    #[validate(length(min = 8, message = "Password must be at least 8 characters long"))]
    pub password: String,
}

// Input for user login
#[derive(Debug, Deserialize, Validate)]
pub struct LoginUser {
    #[validate(email(message = "Must be a valid email"))]
    pub email: String,
    #[validate(length(min = 8, message = "Password must be at least 8 characters long"))]
    pub password: String,
}

impl From<User> for UserPublic {
    fn from(user: User) -> Self {
        UserPublic {
            id: user.id,
            username: user.username,
            email: user.email,
            total_points: user.total_points,
            current_streak: user.current_streak,
            longest_streak: user.longest_streak,
            created_at: user.created_at,
        }
    }
}
