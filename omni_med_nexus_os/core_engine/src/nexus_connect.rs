use std::sync::Mutex;
use once_cell::sync::Lazy;
use serde_json::json;

// --- Data Models ---
pub struct HardwareStatus {
    pub protocol: String,
    pub device_name: String,
    pub status: String,
    pub last_data: String,
}

pub static CONNECTED_DEVICES: Lazy<Mutex<Vec<HardwareStatus>>> = Lazy::new(|| Mutex::new(Vec::new()));

// --- The Great Migration (ETL Engine) ---
pub fn get_shadow_migration_status() -> String {
    // Mocking the progress of the parallel run ETL from old Oracle/SQL databases
    "Shadow Migration Active. Processed: 45,200 records (98%). Est. Cut-off: 2 Days.".to_string()
}

// Simulated background ETL processor
pub fn trigger_mock_etl_batch() -> String {
    let mock_json = json!({
        "source": "Legacy_Oracle_DB",
        "mapped_entity": "Patient_Record",
        "data": { "name": "John Doe", "legacy_id": "ORC-991" }
    });
    // In a real system, this JSON is ingested into the Edge Database via sync_engine.
    format!("ETL Neural Mapping Success: {}", mock_json.to_string())
}

// --- Standardized Gateway (Hardware Integration) ---
pub fn initialize_hardware_gateways() {
    let mut devices = CONNECTED_DEVICES.lock().unwrap();
    if devices.is_empty() {
        devices.push(HardwareStatus {
            protocol: "MQTT".into(),
            device_name: "ICU-BedMonitor-01".into(),
            status: "🟢 Connected".into(),
            last_data: "HR: 85, SpO2: 98%".into(),
        });
        devices.push(HardwareStatus {
            protocol: "DICOM".into(),
            device_name: "MRI-Scanner-A".into(),
            status: "🟡 Standby".into(),
            last_data: "Idle".into(),
        });
        devices.push(HardwareStatus {
            protocol: "HL7".into(),
            device_name: "Lab-Analyzer-X".into(),
            status: "🟢 Connected".into(),
            last_data: "Batch processed".into(),
        });
    }
}

pub fn get_hardware_status(protocol_filter: &str) -> String {
    let devices = CONNECTED_DEVICES.lock().unwrap();
    for dev in devices.iter() {
        if dev.protocol == protocol_filter {
            return format!("{} | {} | {}", dev.status, dev.device_name, dev.last_data);
        }
    }
    "🔴 Offline / Not Integrated".to_string()
}

pub fn get_all_hardware_summary() -> Vec<String> {
    let devices = CONNECTED_DEVICES.lock().unwrap();
    devices.iter().map(|d| format!("[{}] {} - {}", d.protocol, d.device_name, d.status)).collect()
}
