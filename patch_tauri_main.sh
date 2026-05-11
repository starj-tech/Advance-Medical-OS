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
fn get_system_status() -> String {
    engine_version()
}

#[tauri::command]
fn tauri_login_mock(username: String) -> UserProfile {
    login_mock(&username)
}

#[tauri::command]
fn tauri_ghost_scribe(audio_path: String) -> String {
    ghost_scribe_mock_process(&audio_path)
}

#[tauri::command]
fn tauri_check_satusehat() -> String {
    check_satusehat_status()
}

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            // Start the hardware bridge background processor
            let app_handle = app.handle();
            spawn_icu_monitor_stream(app_handle);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_system_status,
            tauri_login_mock,
            tauri_ghost_scribe,
            tauri_check_satusehat
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
INNER_EOF
