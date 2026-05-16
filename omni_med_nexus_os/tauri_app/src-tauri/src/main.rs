#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

pub mod omni_core;
pub mod hardware_bridge;

use omni_core::api::*;
use omni_core::rbac::{login_mock, UserProfile};
use hardware_bridge::spawn_hardware_bridge;
use tauri::Manager;

// Updated to return Result<String, String> for robust error handling

#[tauri::command]
fn get_system_status() -> Result<String, String> {
    Ok(engine_version())
}

#[tauri::command]
fn tauri_login_mock(username: String) -> Result<UserProfile, String> {
    // Usually this could fail on DB, so we return Result
    Ok(login_mock(&username))
}

#[tauri::command]
fn tauri_ghost_scribe(audio_path: String) -> Result<String, String> {
    if audio_path.is_empty() { return Err("Audio path cannot be empty".into()); }
    Ok(ghost_scribe_mock_process(&audio_path))
}

#[tauri::command]
fn tauri_check_satusehat() -> Result<String, String> {
    Ok(check_satusehat_status())
}

#[tauri::command]
fn tauri_trigger_rollback() -> Result<String, String> {
    Ok(trigger_1_click_rollback())
}

#[tauri::command]
fn tauri_sync_heartbeat() -> Result<String, String> {
    Ok(simulate_sync_heartbeat())
}

#[tauri::command]
fn tauri_access_patient(patient_id: String, is_vip: bool, justification: Option<String>) -> Result<String, String> {
    Ok(access_patient_record(&patient_id, is_vip, justification))
}

#[tauri::command]
fn tauri_print_job(payload: String) -> Result<String, String> {
    if payload.is_empty() { return Err("Payload empty".into()); }
    Ok(trigger_print_job(&payload))
}

#[tauri::command]
fn tauri_queue_bpjs(payload: String) -> Result<String, String> {
    Ok(queue_bpjs_claim(&payload))
}

#[tauri::command]
fn tauri_export_escrow() -> Result<String, String> {
    Ok(trigger_data_escrow_export())
}

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let app_handle = app.handle();
            spawn_hardware_bridge(app_handle);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_system_status,
            tauri_login_mock,
            tauri_ghost_scribe,
            tauri_check_satusehat,
            tauri_trigger_rollback,
            tauri_sync_heartbeat,
            tauri_access_patient,
            tauri_print_job,
            tauri_queue_bpjs,
            tauri_export_escrow
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
