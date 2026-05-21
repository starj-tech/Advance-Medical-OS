use flutter_rust_bridge::frb;

#[derive(Clone, Debug)]
pub struct BedStatus {
    pub icu_available: i32,
    pub general_available: i32,
    pub emergency_queue: i32,
}

#[frb(sync)]
pub fn get_realtime_bed_status() -> BedStatus {
    // Simulated Redis cache lookup
    BedStatus {
        icu_available: 4,
        general_available: 45,
        emergency_queue: 12,
    }
}
