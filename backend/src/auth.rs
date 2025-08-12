
use axum::{
    async_trait,
    extract::FromRequestParts, 
    http::request::Parts,
};
use headers::{authorization::Bearer, Authorization, HeaderMapExt};
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::{Duration, Utc};

use crate::errors::AppError;
use crate::state::AppState; 

#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: Uuid,
    pub exp: i64,
    pub iat: i64,
}

pub struct AuthUser(pub Uuid);

#[async_trait]
impl FromRequestParts<AppState> for AuthUser {
    type Rejection = AppError;

    async fn from_request_parts(parts: &mut Parts, state: &AppState) -> Result<Self, Self::Rejection> {

        let bearer = parts
            .headers
            .typed_get::<Authorization<Bearer>>()
            .ok_or(AppError::MissingCredentials)?;

        let decoding_key = DecodingKey::from_secret(state.settings.jwt_secret.as_ref());

        let token_data = decode::<Claims>(bearer.token(), &decoding_key, &Validation::default())
            .map_err(|err| match err.kind() {
                jsonwebtoken::errors::ErrorKind::ExpiredSignature => AppError::TokenExpired,
                _ => AppError::InvalidToken,
            })?;

        Ok(AuthUser(token_data.claims.sub))
    }
}

pub fn create_jwt(user_id: Uuid, jwt_secret: &str) -> Result<String, AppError> {
    let now = Utc::now();
    let expires_in = Duration::days(7); 
    let exp = (now + expires_in).timestamp();
    let iat = now.timestamp();

    let claims = Claims {
        sub: user_id,
        exp,
        iat,
    };

    let encoding_key = EncodingKey::from_secret(jwt_secret.as_ref());
    encode(&Header::default(), &claims, &encoding_key)
        .map_err(|_e| AppError::Anyhow(anyhow::anyhow!("Failed to create JWT")))
}