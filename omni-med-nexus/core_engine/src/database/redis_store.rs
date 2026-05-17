use redis::{Client, Connection, RedisResult};

pub fn connect_redis(redis_url: &str) -> RedisResult<Connection> {
    let client = Client::open(redis_url)?;
    client.get_connection()
}
