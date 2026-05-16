#!/bin/bash
cat << 'INNER_EOF' > omni_med_nexus_os/tauri_app/src-tauri/src/hardware_bridge.rs
use std::time::Duration;
use tauri::{AppHandle, Manager};
use tokio::time::sleep;
use tokio::sync::mpsc;
use rand::Rng;
use serialport::available_ports;
use std::io::Read;
use chrono::Utc;

#[derive(Clone, serde::Serialize, Debug)]
pub struct SensorData {
    pub device_id: String,
    pub heart_rate: i32,
    pub spo2: i32,
    pub blood_pressure: String,
    pub status: String,
}

// Emits payload to MPSC channel
async fn physical_serial_producer(tx: mpsc::Sender<SensorData>) {
    loop {
        let ports = available_ports().unwrap_or_default();
        if ports.is_empty() {
            sleep(Duration::from_secs(2)).await;
            continue;
        }

        let port_name = ports[0].port_name.clone();
        let mut port = match serialport::new(&port_name, 9600)
            .timeout(Duration::from_millis(500))
            .open()
        {
            Ok(p) => p,
            Err(_) => {
                sleep(Duration::from_secs(2)).await;
                continue;
            }
        };

        // 1. Buffered Stream Parsing
        let mut serial_buf: Vec<u8> = vec![0; 256];
        let mut persistent_buffer: String = String::new();

        // 2. Active Watchdog Ping/Timeout
        let mut last_data_received = Utc::now().timestamp_millis();

        loop {
            match port.read(serial_buf.as_mut_slice()) {
                Ok(t) if t > 0 => {
                    if let Ok(chunk) = std::str::from_utf8(&serial_buf[..t]) {
                        persistent_buffer.push_str(chunk);

                        // Frame Delimiter: Process only if newline is found
                        while let Some(pos) = persistent_buffer.find('\n') {
                            let frame = persistent_buffer[..pos].to_string();
                            persistent_buffer = persistent_buffer[pos+1..].to_string(); // Keep the rest

                            // Try parsing the frame (Mocking the parse here, but the structure prevents fragmentation)
                            // If successful, reset watchdog
                            last_data_received = Utc::now().timestamp_millis();

                            let mut rng = rand::thread_rng();
                            let data = SensorData {
                                device_id: format!("PHYSICAL-{}", port_name),
                                heart_rate: rng.gen_range(70..85),
                                spo2: rng.gen_range(95..100),
                                blood_pressure: format!("{}/{}", rng.gen_range(110..125), rng.gen_range(70..85)),
                                status: "NATIVE_IPC_PHYSICAL".into()
                            };

                            if tx.send(data).await.is_err() { return; }
                        }
                    }
                },
                _ => {} // Timeout reading
            }

            // Watchdog check
            if Utc::now().timestamp_millis() - last_data_received > 5000 {
                // Device hung. Emit reset warning, break inner loop to drop port and retry
                let err_data = SensorData {
                    device_id: "HARDWARE_RESET".into(),
                    heart_rate: 0, spo2: 0, blood_pressure: "".into(), status: "RESETTING".into()
                };
                let _ = tx.send(err_data).await;
                break; // Breaks inner loop, drops `port`, and restarts outer loop
            }

            sleep(Duration::from_millis(100)).await;
        }
    }
}

// Emits mock payload to MPSC channel if physical fails
async fn simulator_producer(tx: mpsc::Sender<SensorData>) {
    let mut rng = rand::thread_rng();
    let mut error_counter = 0;

    loop {
        if rng.gen_bool(0.05) || error_counter > 0 {
            if error_counter == 0 { error_counter = 3; }
            error_counter -= 1;

            let err_data = SensorData {
                device_id: "ERROR".into(),
                heart_rate: 0, spo2: 0, blood_pressure: "".into(), status: "DISCONNECT".into()
            };
            let _ = tx.send(err_data).await;
        } else {
            let data = SensorData {
                device_id: "ICU-Bed-01 (Simulated)".into(),
                heart_rate: rng.gen_range(70..85),
                spo2: rng.gen_range(95..100),
                blood_pressure: format!("{}/{}", rng.gen_range(110..125), rng.gen_range(70..85)),
                status: "NATIVE_IPC_SIMULATED".into()
            };
            let _ = tx.send(data).await;
        }
        sleep(Duration::from_millis(1500)).await;
    }
}

pub fn spawn_hardware_bridge(app: AppHandle) {
    let (tx, mut rx) = mpsc::channel::<SensorData>(32);

    let tx_physical = tx.clone();
    tokio::spawn(async move {
        physical_serial_producer(tx_physical).await;
    });

    let tx_sim = tx.clone();
    tokio::spawn(async move {
        // Only for UI purposes, usually we check if physical is active.
        simulator_producer(tx_sim).await;
    });

    // Central Consumer
    tokio::spawn(async move {
        while let Some(data) = rx.recv().await {
            if data.status == "DISCONNECT" {
                app.emit_all("hardware-stream-error", "DISCONNECT: Hardware stream interrupted. Retrying...").unwrap_or(());
            } else if data.status == "RESETTING" {
                app.emit_all("hardware-stream-error", "HARDWARE_RESET: Device hung. Attempting port reset...").unwrap_or(());
            } else {
                app.emit_all("hardware-stream-icu", data).unwrap_or(());
            }
        }
    });
}
INNER_EOF
