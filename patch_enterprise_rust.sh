#!/bin/bash
# 1. Update Sync Engine for CRDT Split-Brain Flagging
cat << 'INNER_EOF' > omni_med_nexus_os/tauri_app/src-tauri/src/omni_core/sync_engine.rs
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
INNER_EOF

# 2. Update Hardware Bridge for Watchdog (Disconnect Events)
cat << 'INNER_EOF' > omni_med_nexus_os/tauri_app/src-tauri/src/hardware_bridge.rs
use std::time::Duration;
use tauri::{AppHandle, Manager};
use tokio::time::sleep;
use rand::Rng;

#[derive(Clone, serde::Serialize)]
struct SensorData {
    device_id: String,
    heart_rate: i32,
    spo2: i32,
    blood_pressure: String,
    status: String,
}

pub fn spawn_icu_monitor_stream(app: AppHandle) {
    tokio::spawn(async move {
        let mut rng = rand::thread_rng();
        let mut error_counter = 0;

        loop {
            // Hardware Watchdog: Simulate a 10% chance the cable is kicked out
            if rng.gen_bool(0.1) || error_counter > 0 {
                if error_counter == 0 { error_counter = 5; } // Keep it disconnected for 5 cycles
                error_counter -= 1;

                app.emit_all("hardware-stream-error", "DISCONNECT: Cable unplugged or port rusted. Graceful degradation active.").unwrap_or(());
            } else {
                let hr = rng.gen_range(70..85);
                let spo2 = rng.gen_range(95..100);
                let sys = rng.gen_range(110..125);
                let dia = rng.gen_range(70..85);

                let data = SensorData {
                    device_id: "ICU-Bed-01".into(),
                    heart_rate: hr,
                    spo2,
                    blood_pressure: format!("{}/{}", sys, dia),
                    status: "CONNECTED".into()
                };
                app.emit_all("hardware-stream-icu", data).unwrap_or(());
            }
            sleep(Duration::from_millis(2000)).await;
        }
    });
}
INNER_EOF

# 3. Create Disaster Recovery (Kill-Switch) module
cat << 'INNER_EOF' > omni_med_nexus_os/tauri_app/src-tauri/src/omni_core/disaster_recovery.rs
use std::sync::Mutex;
use once_cell::sync::Lazy;

pub static IS_LEGACY_FALLBACK: Lazy<Mutex<bool>> = Lazy::new(|| Mutex::new(false));

pub fn trigger_1_click_rollback() -> String {
    let mut fallback = IS_LEGACY_FALLBACK.lock().unwrap();
    *fallback = true;

    // Simulate shutting down NexusConnect ETL and rerouting to legacy systems
    "EMERGENCY ROLLBACK INITIATED: NexusConnect ETL paused. Rerouting all operational endpoints back to legacy Oracle DB. System safe.".to_string()
}
INNER_EOF

# Update Lib
sed -i 's/pub mod rbac;/pub mod rbac;\npub mod disaster_recovery;/' omni_med_nexus_os/tauri_app/src-tauri/src/omni_core/lib.rs

# Update API
sed -i 's/pub use crate::omni_core::rbac::\*;/pub use crate::omni_core::rbac::\*;\npub use crate::omni_core::disaster_recovery::\*;\n/' omni_med_nexus_os/tauri_app/src-tauri/src/omni_core/api.rs
