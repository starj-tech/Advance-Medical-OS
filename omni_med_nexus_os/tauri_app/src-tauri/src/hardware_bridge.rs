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
