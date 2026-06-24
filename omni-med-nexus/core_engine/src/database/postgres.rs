use sqlx::{Pool, Postgres, postgres::PgPoolOptions};

pub async fn init_pool(database_url: &str) -> Result<Pool<Postgres>, sqlx::Error> {
    PgPoolOptions::new()
        .max_connections(5)
        .connect(database_url)
        .await
}
