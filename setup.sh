#!/bin/bash
mkdir -p omni_med_nexus_os/core_engine/src omni_med_nexus_os/infrastructure

# Setup Core Engine
cat << 'TOML' > omni_med_nexus_os/core_engine/Cargo.toml
[package]
name = "core_engine"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib", "staticlib"]

[dependencies]
rusqlite = "0.31"
sha2 = "0.10.8"
chrono = "0.4"
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
flutter_rust_bridge = "=2.12.0"
TOML

cat << 'RS' > omni_med_nexus_os/core_engine/src/database.rs
use rusqlite::{Connection, Result};
pub struct EdgeDatabase { pub conn: Connection }
impl EdgeDatabase {
    pub fn new(db_path: &str) -> Result<Self> {
        let conn = Connection::open(db_path)?;
        let db = EdgeDatabase { conn };
        db.initialize_schema()?;
        Ok(db)
    }
    fn initialize_schema(&self) -> Result<()> {
        self.conn.execute("CREATE TABLE IF NOT EXISTS patients_global (id INTEGER PRIMARY KEY AUTOINCREMENT, unified_id TEXT NOT NULL UNIQUE, name TEXT NOT NULL, dob DATE NOT NULL)", [])?;
        self.conn.execute("CREATE TABLE IF NOT EXISTS hospitals (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, region TEXT NOT NULL)", [])?;
        self.conn.execute("CREATE TABLE IF NOT EXISTS inventory (id INTEGER PRIMARY KEY AUTOINCREMENT, hospital_id INTEGER NOT NULL, item_name TEXT NOT NULL, efficacy_class TEXT, quantity INTEGER NOT NULL, expiry_date DATE NOT NULL, FOREIGN KEY(hospital_id) REFERENCES hospitals(id))", [])?;
        self.conn.execute("CREATE TABLE IF NOT EXISTS billing (id INTEGER PRIMARY KEY AUTOINCREMENT, patient_id INTEGER NOT NULL, hospital_id INTEGER NOT NULL, amount REAL NOT NULL, description TEXT NOT NULL, is_audited BOOLEAN DEFAULT FALSE, FOREIGN KEY(patient_id) REFERENCES patients_global(id), FOREIGN KEY(hospital_id) REFERENCES hospitals(id))", [])?;
        self.conn.execute("CREATE TABLE IF NOT EXISTS asset_usage_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, patient_id INTEGER NOT NULL, asset_name TEXT NOT NULL, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP)", [])?;
        self.conn.execute("CREATE TABLE IF NOT EXISTS assets_3d_locations (id INTEGER PRIMARY KEY AUTOINCREMENT, hospital_id INTEGER NOT NULL, asset_name TEXT NOT NULL, asset_type TEXT NOT NULL, pos_x REAL NOT NULL, pos_y REAL NOT NULL, pos_z REAL NOT NULL, status TEXT NOT NULL)", [])?;
        self.conn.execute("CREATE TABLE IF NOT EXISTS logs (id INTEGER PRIMARY KEY AUTOINCREMENT, action TEXT NOT NULL, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP)", [])?;
        Ok(())
    }
}
RS

cat << 'RS' > omni_med_nexus_os/core_engine/src/clinical.rs
pub fn ghost_scribe_mock_process(audio_path: &str) -> String { format!("Processed audio '{}': \nDiagnosis: Mild Hypertension. \nNotes: Patient reported headaches.", audio_path) }
pub fn get_diagnostic_overlay() -> Vec<f64> { vec![120.0, 122.0, 118.0, 125.0, 130.0, 128.0] }
pub fn one_tap_prescription(drug: &str) -> String {
    if drug == "Aspirin" { "Aspirin in stock: 150 units. Dispensing 1 unit.".to_string() } else { format!("{} out of stock. Suggested alternative: Ibuprofen.", drug) }
}
RS

cat << 'RS' > omni_med_nexus_os/core_engine/src/operational.rs
pub fn check_revenue_guard() -> String { "ALERT: 2 MRI usages not billed. Potential loss: $1200. Automatically generating draft invoices...".to_string() }
pub fn digital_twin_simulation(extra_nurses: i32) -> String {
    let current_wait_time = 45;
    let new_wait_time = std::cmp::max(5, current_wait_time - (extra_nurses * 10));
    format!("Simulated Wait Time with {} extra nurses: {} minutes", extra_nurses, new_wait_time)
}
pub fn get_asset_locations() -> Vec<(String, f64, f64, f64)> { vec![("Ventilator V-01".into(), 10.5, 20.0, 1.0), ("Wheelchair W-12".into(), 45.0, 10.0, 0.0)] }
RS

cat << 'RS' > omni_med_nexus_os/core_engine/src/strategic.rs
pub fn global_resource_mesh() -> String { "ACTION: Moving 50 units of Amoxicillin from RS Alpha (Expiring in 2 weeks) to RS Beta (Shortage).".to_string() }
pub fn run_benchmarking() -> String { "BENCHMARK: RS Alpha has 15% faster emergency response than RS Gamma. Standardizing triage protocol across chain...".to_string() }
RS

cat << 'RS' > omni_med_nexus_os/core_engine/src/api.rs
pub use crate::clinical::*;
pub use crate::operational::*;
pub use crate::strategic::*;
pub fn engine_version() -> String { "0.2.0".to_string() }
RS

cat << 'RS' > omni_med_nexus_os/core_engine/src/lib.rs
pub mod database;
pub mod clinical;
pub mod operational;
pub mod strategic;
pub mod api;
RS

# Setup UI App
flutter config --enable-linux-desktop --enable-macos-desktop --enable-windows-desktop
cd omni_med_nexus_os && flutter create --platforms=linux,macos,windows ui_app
cd ui_app
flutter pub add flutter_rust_bridge fl_chart flutter_3d_controller model_viewer_plus audio_waveforms record

cat << 'YML' > flutter_rust_bridge.yaml
rust_root: "../core_engine"
rust_input: "crate::api"
dart_output: "lib/src/rust"
YML

flutter_rust_bridge_codegen integrate
flutter_rust_bridge_codegen generate
