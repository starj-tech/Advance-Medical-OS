use std::sync::Mutex;
use once_cell::sync::Lazy;

pub static IS_LEGACY_FALLBACK: Lazy<Mutex<bool>> = Lazy::new(|| Mutex::new(false));

pub fn trigger_1_click_rollback() -> String {
    let mut fallback = IS_LEGACY_FALLBACK.lock().unwrap();
    *fallback = true;

    // Simulate shutting down NexusConnect ETL and rerouting to legacy systems
    "EMERGENCY ROLLBACK INITIATED: NexusConnect ETL paused. Rerouting all operational endpoints back to legacy Oracle DB. System safe.".to_string()
}
