use backend::errors::AppError; 

#[tokio::main]
async fn main() -> Result<(), AppError> {
    backend::run().await
}