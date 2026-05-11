use std::sync::Mutex;
use chrono::Utc;
use once_cell::sync::Lazy;
use crate::security::encrypt_data;

pub struct DeltaChange {
    pub entity_id: String,
    pub field: String,
    pub encrypted_payload: String,
    pub timestamp: i64,
    pub writer_device_id: String,
}

pub static DELTA_QUEUE: Lazy<Mutex<Vec<DeltaChange>>> = Lazy::new(|| Mutex::new(Vec::new()));

pub fn record_delta_change(entity_id: &str, field: &str, raw_value: &str, device_id: &str) {
    let encrypted = encrypt_data(raw_value);
    let delta = DeltaChange {
        entity_id: entity_id.to_string(),
        field: field.to_string(),
        encrypted_payload: encrypted,
        timestamp: Utc::now().timestamp_millis(),
        writer_device_id: device_id.to_string()
    };

    let mut queue = DELTA_QUEUE.lock().unwrap();
    queue.push(delta);
}

// Simulates LWW (Last-Writer-Wins) conflict resolution during sync
pub fn simulate_sync_heartbeat() -> String {
    let mut queue = DELTA_QUEUE.lock().unwrap();
    let count = queue.len();
    queue.clear(); // Simulate successfully pushing to central Polyglot server
    format!("Heartbeat Sync Complete. {} Delta(s) pushed securely.", count)
}
