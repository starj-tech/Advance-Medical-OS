#!/bin/bash
rm omni_med_nexus_os/tauri_app/src-tauri/src/omni_core/lib.rs

# Create mod.rs for omni_core so Rust recognizes the folder as a module
cat << 'INNER_EOF' > omni_med_nexus_os/tauri_app/src-tauri/src/omni_core/mod.rs
pub mod database;
pub mod clinical;
pub mod clinical_extended;
pub mod operational;
pub mod strategic;
pub mod nce;
pub mod blockchain;
pub mod satusehat_bridge;
pub mod security;
pub mod sync_engine;
pub mod rbac;
pub mod nexus_connect;
pub mod api;
pub mod license_manager;
INNER_EOF
