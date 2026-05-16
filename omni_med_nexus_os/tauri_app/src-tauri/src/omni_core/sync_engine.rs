use std::sync::Mutex;
use chrono::Utc;
use once_cell::sync::Lazy;
use crate::omni_core::security::encrypt_data;

#[derive(Clone, serde::Serialize)]
pub struct DeltaChange {
    pub entity_id: String,
    pub field: String,
    pub encrypted_payload: String,
    pub timestamp: i64,
    pub writer_device_id: String,
    pub conflict_flag: bool,
}

pub static DELTA_QUEUE: Lazy<Mutex<Vec<DeltaChange>>> = Lazy::new(|| Mutex::new(Vec::new()));

pub fn record_delta_change(entity_id: &str, field: &str, raw_value: &str, device_id: &str) {
    let encrypted = encrypt_data(raw_value);

    let mut queue = DELTA_QUEUE.lock().unwrap();
    // CRDT Split-Brain Mitigation: Check if another offline device recently touched this entity/field
    let conflict = queue.iter().any(|d| d.entity_id == entity_id && d.field == field && d.writer_device_id != device_id);

    let delta = DeltaChange {
        entity_id: entity_id.to_string(),
        field: field.to_string(),
        encrypted_payload: encrypted,
        timestamp: Utc::now().timestamp_millis(),
        writer_device_id: device_id.to_string(),
        conflict_flag: conflict,
    };

    queue.push(delta);
}

pub fn simulate_sync_heartbeat() -> String {
    let mut queue = DELTA_QUEUE.lock().unwrap();
    let conflicts: Vec<_> = queue.iter().filter(|d| d.conflict_flag).collect();

    if !conflicts.is_empty() {
        let msg = format!("SYNC PAUSED: {} offline conflicts detected. Manual verification required to prevent data corruption.", conflicts.len());
        // In reality, we don't clear the queue here; we await resolution.
        return msg;
    }

    let count = queue.len();
    queue.clear();
    format!("Heartbeat Sync Complete. {} Delta(s) pushed securely.", count)
}
