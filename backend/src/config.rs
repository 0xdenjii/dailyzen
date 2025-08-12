use serde::Deserialize;

#[derive(Deserialize, Debug, Clone)]
pub struct DatabaseSettings {
    pub host: String,
    pub port: u16,
    pub username: String,
    pub password: String,
    pub db_name: String,
    pub ssl_mode: bool,
}

#[derive(Deserialize, Debug, Clone)]
pub struct Settings {
    pub application_port: u16,
    pub jwt_secret: String,
    pub database: DatabaseSettings,
}

impl Settings {
    pub fn database_connection_string(&self) -> String {
        format!(
            "postgres://{}:password@{}:{}/{}",
            self.database.username,
            self.database.password,
            self.database.host,
            self.database.port,
            self.database.db_name
        )
    }

    // Helper function to build the connection string for the maintenance DB
    pub fn maintenance_database_connection_string(&self) -> String {
        format!(
           "postgres://{}:password@{}:{}/postgres",
            self.database.username,
            self.database.password,
            self.database.host,
            self.database.port,
        )
    }
}


pub fn get_config() -> Result<Settings, config::ConfigError> {
    let settings = config::Config::builder()
        .add_source(config::File::new("config.toml", config::FileFormat::Toml))
        .add_source(config::Environment::with_prefix("APP").separator("__"))
        .build()?;

    settings.try_deserialize::<Settings>()
}