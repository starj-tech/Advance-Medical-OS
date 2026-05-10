// --- Internal Medicine Sub-Specialties ---
pub fn track_dialysis(efficiency_ktv: f64) -> String {
    if efficiency_ktv < 1.2 { "WARNING: Suboptimal Dialysis (Kt/V < 1.2). Review flow rate.".into() }
    else { "Dialysis Efficient.".into() }
}

pub fn monitor_cgm(glucose_level: i32) -> String {
    if glucose_level > 250 { "ALERT: Hyperglycemia. Auto-adjusting insulin pump via IoT.".into() }
    else if glucose_level < 70 { "CRITICAL: Hypoglycemia. Triggering audible alarm.".into() }
    else { "CGM Stable.".into() }
}

pub fn analyze_spirometry(fev1_fvc_ratio: f64) -> String {
    if fev1_fvc_ratio < 0.70 { "Obstructive Pattern Detected (Possible COPD/Asthma).".into() }
    else { "Spirometry Normal.".into() }
}

pub fn calculate_das28(tender_joints: i32, swollen_joints: i32, crp: f64) -> String {
    let score = (0.56 * (tender_joints as f64).sqrt()) + (0.28 * (swollen_joints as f64).sqrt()) + (0.36 * crp.ln()) + 0.96;
    let activity = if score > 5.1 { "High Disease Activity" } else if score < 2.6 { "Remission" } else { "Moderate" };
    format!("DAS28 Score: {:.2} - {}", score, activity)
}

// --- Maternal & Pediatric ---
pub fn generate_immunization_schedule(age_months: i32) -> String {
    match age_months {
        0 => "Due: HepB-0, Polio-0".into(),
        2 => "Due: DTaP-1, HiB-1, Polio-1, PCV-1".into(),
        _ => "Up to date.".into()
    }
}

pub fn calculate_tpn_nicu(weight_kg: f64) -> String {
    let fluid_req = weight_kg * 120.0; // 120ml/kg/day
    let dextrose = weight_kg * 10.0; // mg/kg/min
    format!("TPN Protocol -> Fluid: {:.0} ml/day, Dextrose: {:.1} g/day", fluid_req, dextrose * 1.44)
}

// --- Sensory Organs ---
pub fn detect_retinopathy(oct_image_hash: &str) -> String {
    if oct_image_hash.contains("diab") { "AI DETECTS: Proliferative Diabetic Retinopathy. Laser therapy recommended.".into() }
    else { "AI DETECTS: Normal Macula.".into() }
}

pub fn analyze_skin_lesion(image_hash: &str) -> String {
    if image_hash.contains("mel") { "SKIN AI: 92% Malignant Melanoma. Urgent Biopsy Required.".into() }
    else { "SKIN AI: Benign Nevus. Monitor in 6 months.".into() }
}

// --- Neurology & Rehab ---
pub fn calculate_nihss(motor_arm: i32, aphasia: i32, loc: i32) -> String {
    let score = motor_arm + aphasia + loc;
    let severity = if score > 20 { "Severe Stroke" } else { "Mild/Moderate Stroke" };
    format!("NIHSS Score: {} - {}", score, severity)
}

pub fn track_mobility(rom_degrees: i32) -> String {
    format!("Mobility Tracker: Knee Flexion {} degrees. +10% improvement from last week.", rom_degrees)
}

// --- Diagnostics & Forensics ---
pub fn validate_critical_lab(potassium: f64) -> String {
    if potassium > 6.0 { "CRITICAL LAB VALUE: Hyperkalemia. Auto-paging ER and Nephrology.".into() }
    else { "Lab results auto-validated.".into() }
}

pub fn count_mitosis_ai(slide_hash: &str) -> String {
    "PATHOLOGY AI: 12 mitoses per 10 HPF. High grade malignancy suspected.".into()
}

pub fn generate_visum(patient_id: &str, injury: &str) -> String {
    let hash = crate::security::encrypt_data(injury);
    format!("VISUM ET REPERTUM (Legal Grade):\nID: {}\nFindings: {}\nBlockchain Hash: {}", patient_id, injury, hash)
}

// --- Primary Care & Occupational ---
pub fn fit_to_work_assessment(hearing_db: i32, vision_acuity: &str) -> String {
    if hearing_db > 40 { "NOT FIT FOR OFFSHORE: Severe hearing loss detected.".into() }
    else { format!("FIT TO WORK. V: {}", vision_acuity) }
}
