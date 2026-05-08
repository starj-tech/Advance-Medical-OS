pub fn check_revenue_guard() -> String { "ALERT: 2 MRI usages not billed. Potential loss: $1200. Automatically generating draft invoices...".to_string() }
pub fn digital_twin_simulation(extra_nurses: i32) -> String {
    let current_wait_time = 45;
    let new_wait_time = std::cmp::max(5, current_wait_time - (extra_nurses * 10));
    format!("Simulated Wait Time with {} extra nurses: {} minutes", extra_nurses, new_wait_time)
}
pub fn get_asset_locations() -> Vec<(String, f64, f64, f64)> { vec![("Ventilator V-01".into(), 10.5, 20.0, 1.0), ("Wheelchair W-12".into(), 45.0, 10.0, 0.0)] }
