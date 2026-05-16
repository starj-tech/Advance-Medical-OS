#!/bin/bash
cat << 'INNER_EOF' > omni_med_nexus_os/tauri_app/src-tauri/src/main.rs
#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

pub mod omni_core;
pub mod hardware_bridge;

use omni_core::api::*;
use omni_core::rbac::{login_mock, UserProfile};
use hardware_bridge::spawn_icu_monitor_stream;
use tauri::Manager;

#[tauri::command]
fn get_system_status() -> String { engine_version() }

#[tauri::command]
fn tauri_login_mock(username: String) -> UserProfile { login_mock(&username) }

#[tauri::command]
fn tauri_ghost_scribe(audio_path: String) -> String { ghost_scribe_mock_process(&audio_path) }

#[tauri::command]
fn tauri_check_satusehat() -> String { check_satusehat_status() }

#[tauri::command]
fn tauri_trigger_rollback() -> String { trigger_1_click_rollback() }

#[tauri::command]
fn tauri_sync_heartbeat() -> String { simulate_sync_heartbeat() }

// NEW: Enterprise Endpoints
#[tauri::command]
fn tauri_access_patient(patient_id: String, is_vip: bool, justification: Option<String>) -> String {
    access_patient_record(&patient_id, is_vip, justification)
}

#[tauri::command]
fn tauri_print_job(payload: String) -> String {
    trigger_print_job(&payload)
}

#[tauri::command]
fn tauri_queue_bpjs(payload: String) -> String {
    queue_bpjs_claim(&payload)
}

#[tauri::command]
fn tauri_export_escrow() -> String {
    trigger_data_escrow_export()
}

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let app_handle = app.handle();
            spawn_icu_monitor_stream(app_handle);
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
INNER_EOF
