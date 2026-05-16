use std::sync::Mutex;
use once_cell::sync::Lazy;

pub static BPJS_QUEUE: Lazy<Mutex<Vec<String>>> = Lazy::new(|| Mutex::new(Vec::new()));

pub fn queue_bpjs_claim(claim_json: &str) -> String {
    let mut queue = BPJS_QUEUE.lock().unwrap();
    queue.push(claim_json.to_string());
    // This allows the patient to go home immediately while the backend retries sending it to Kemenkes
    format!("Claim added to Async Retry Queue. Total in queue: {}. Patient may proceed to checkout.", queue.len())
}

pub fn simulate_bpjs_background_worker() {
    // Background worker that retries sending claims
    let mut queue = BPJS_QUEUE.lock().unwrap();
    if !queue.is_empty() {
        println!("BACKGROUND WORKER: Attempting to flush {} claims to V-Claim...", queue.len());
        queue.clear();
    }
}
