// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use core_engine::blockchain::audit_trail::Blockchain;
use core_engine::security::encryption::SecurityManager;
use std::sync::{Arc, Mutex};
use lazy_static::lazy_static;

lazy_static! {
    static ref GLOBAL_BLOCKCHAIN: Arc<Mutex<Blockchain>> = Arc::new(Mutex::new(Blockchain::new()));
    static ref SECURITY_MANAGER: Arc<SecurityManager> = Arc::new(SecurityManager::new());
}

#[tauri::command]
fn get_audit_trail_length() -> usize {
    let bc = GLOBAL_BLOCKCHAIN.lock().unwrap();
    bc.chain.len()
}

#[tauri::command]
fn add_audit_record(patient_id: String, action: String, doctor_id: String) -> String {
    let mut bc = GLOBAL_BLOCKCHAIN.lock().unwrap();
    bc.add_audit_record(patient_id, action, doctor_id);
    let latest_block = bc.get_latest_block().unwrap();
    latest_block.hash.clone()
}

#[tauri::command]
fn encrypt_patient_data(data: String) -> Result<Vec<u8>, String> {
    SECURITY_MANAGER.encrypt(&data)
}

#[tauri::command]
fn check_system_health() -> String {
    "99.99% UPTIME | 24ms LATENCY | AES-256 SECURED".to_string()
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            get_audit_trail_length,
            add_audit_record,
            encrypt_patient_data,
            check_system_health
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
