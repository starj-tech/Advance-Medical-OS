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
}

// Spawns a background task representing an ICU monitor stream
pub fn spawn_icu_monitor_stream(app: AppHandle) {
    tokio::spawn(async move {
        let mut rng = rand::thread_rng();
        loop {
            // Simulate reading from serialport / MQTT
            let hr = rng.gen_range(70..85);
            let spo2 = rng.gen_range(95..100);
            let sys = rng.gen_range(110..125);
            let dia = rng.gen_range(70..85);

            let data = SensorData {
                device_id: "ICU-Bed-01".into(),
                heart_rate: hr,
                spo2,
                blood_pressure: format!("{}/{}", sys, dia),
            };

            // Push to Web Frontend using Tauri Event Emitter
            app.emit_all("hardware-stream-icu", data).unwrap_or(());

            sleep(Duration::from_millis(1000)).await;
        }
    });
}
