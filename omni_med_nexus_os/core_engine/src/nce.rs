// Neural-Clinical Engine (NCE) logic

pub fn predict_ews(heart_rate: f64, systolic_bp: f64, temp: f64) -> String {
    // Early Warning System mock logic
    // Normally uses ML models over timeseries data to predict deterioration 6-12 hours out
    if heart_rate > 110.0 || systolic_bp < 90.0 || temp > 39.0 {
        "ALERT: EWS indicates 85% probability of Sepsis/Deterioration within 8 hours. Immediate review required.".to_string()
    } else {
        "EWS: Stable. Patient deterioration probability < 5% in next 12 hours.".to_string()
    }
}

pub fn auto_code_icd10(diagnosis: &str) -> String {
    // Mock NLP-to-ICD10 dictionary mapping
    let lower_diag = diagnosis.to_lowercase();
    if lower_diag.contains("hypertension") {
        "I10 (Essential primary hypertension)".to_string()
    } else if lower_diag.contains("dengue") {
        "A90 (Dengue fever)".to_string()
    } else if lower_diag.contains("diabetes") {
        "E11 (Type 2 diabetes mellitus)".to_string()
    } else {
        "R69 (Unknown and unspecified causes of morbidity)".to_string()
    }
}

pub fn cross_check_safety(patient_condition: &str, drug: &str) -> String {
    // Mock safety cross-check based on patient allergies/conditions
    let cond = patient_condition.to_lowercase();
    let d = drug.to_lowercase();

    if cond.contains("asthma") && d.contains("beta-blocker") {
        "CONTRAINDICATION DETECTED: Beta-blockers can trigger severe asthma attacks.".to_string()
    } else if cond.contains("kidney failure") && d.contains("nsaid") {
        "CONTRAINDICATION DETECTED: NSAIDs can worsen renal function.".to_string()
    } else {
        "SAFETY CHECK: Clear. No known severe interactions found.".to_string()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_cross_check_safety_asthma_beta_blocker() {
        let condition = "Patient has severe Asthma";
        let drug = "Propranolol (beta-blocker)";
        let result = cross_check_safety(condition, drug);
        assert_eq!(result, "CONTRAINDICATION DETECTED: Beta-blockers can trigger severe asthma attacks.");
    }

    #[test]
    fn test_cross_check_safety_kidney_failure_nsaid() {
        let condition = "Chronic kidney failure stage 3";
        let drug = "Ibuprofen (NSAID)";
        let result = cross_check_safety(condition, drug);
        assert_eq!(result, "CONTRAINDICATION DETECTED: NSAIDs can worsen renal function.");
    }

    #[test]
    fn test_cross_check_safety_clear() {
        let condition = "Healthy adult";
        let drug = "Vitamin C";
        let result = cross_check_safety(condition, drug);
        assert_eq!(result, "SAFETY CHECK: Clear. No known severe interactions found.");
    }

    #[test]
    fn test_cross_check_safety_case_insensitivity() {
        let condition = "AsThMa";
        let drug = "BeTa-BlOcKeR";
        let result = cross_check_safety(condition, drug);
        assert_eq!(result, "CONTRAINDICATION DETECTED: Beta-blockers can trigger severe asthma attacks.");
    }

    #[test]
    fn test_cross_check_safety_empty_strings() {
        let condition = "";
        let drug = "";
        let result = cross_check_safety(condition, drug);
        assert_eq!(result, "SAFETY CHECK: Clear. No known severe interactions found.");
    }
}
