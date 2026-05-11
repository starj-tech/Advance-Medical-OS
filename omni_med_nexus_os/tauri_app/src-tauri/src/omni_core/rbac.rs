use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum UserRole {
    // 1. High-Stakes (Gawat Darurat & Intensif)
    SpEM,       // Emergency Medicine (ER)
    SpAn,       // Anesthesiologist
    Intensivist, // ICU

    // 2. Precision Sculptors (Bedah)
    SpBS,       // Neurosurgeon
    SpOT,       // Orthopedic Surgeon
    SpBKV,      // Cardiac Surgeon (Thoracic & Cardiovascular)

    // 3. Medical Detectives (Penyakit Dalam & Kronis)
    Cardiologist,
    Oncologist,
    Nephrologist,
    Endocrinologist,
    Pulmonologist,

    // 4. Maternal, Child & Reproduction
    SpOG,       // Obstetrician
    SpA,        // Pediatrician
    Neonatologist,

    // 5. Diagnostics & Ancillary
    Radiologist,
    Pathologist,
    SpKFR,      // Medical Rehabilitation

    // 6. Mental Health & Neurology
    SpKJ,       // Psychiatrist
    Neurologist,

    // 7. Primary Care
    GP,         // General Practitioner
    FamilyPhysician,
    PrimaryCareClinician,
    SpOk,       // Occupational Health

    // 8. Deep Internists (Sub-specialties)
    Gastroenterologist,
    Rheumatologist,
    Hematologist,
    Allergist,
    Geriatrician,
    TropicalMedicine,

    // 9. Surgical Sub-specialties
    Urologist,
    PlasticSurgeon,
    VascularSurgeon,
    PediatricSurgeon,

    // 10. Sensory Organs
    SpM,        // Ophthalmologist
    SpTHT,      // Otorhinolaryngologist
    SpKK,       // Dermatologist & Venereologist

    // 11. Advanced Diagnostics
    NuclearMedicine,
    SpPK,       // Clinical Pathologist
    SpPA,       // Anatomical Pathologist
    ForensicMed,
    ClinicalPharmacologist,

    // 12. Nutrition & Sports
    SpGK,       // Clinical Nutritionist
    SpKO,       // Sports Medicine

    // Operational Dimension (Controllers)
    CEO,
    CFO,
    CHRO,
    InventoryManager,

    // Holding Dimension (Strategists)
    RegionalManager,
    GroupAuditor,
    InvestmentBoard,

    TemplateClinical, // Fallback
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserProfile {
    pub user_id: String,
    pub name: String,
    pub role: UserRole,
    pub primary_hospital_id: String,
}

pub fn login_mock(username: &str) -> UserProfile {
    match username {
        "dr_er" => UserProfile { user_id: "u1".into(), name: "Dr. Alpha (ER)".into(), role: UserRole::SpEM, primary_hospital_id: "HOSP_1".into() },
        "dr_anes" => UserProfile { user_id: "u2".into(), name: "Dr. Beta (Anesthesiologist)".into(), role: UserRole::SpAn, primary_hospital_id: "HOSP_1".into() },
        "dr_icu" => UserProfile { user_id: "u3".into(), name: "Dr. Gamma (Intensivist)".into(), role: UserRole::Intensivist, primary_hospital_id: "HOSP_1".into() },

        "dr_neuro" => UserProfile { user_id: "u4".into(), name: "Dr. Delta (Neurosurgeon)".into(), role: UserRole::SpBS, primary_hospital_id: "HOSP_1".into() },
        "dr_ortho" => UserProfile { user_id: "u5".into(), name: "Dr. Epsilon (Orthopedic)".into(), role: UserRole::SpOT, primary_hospital_id: "HOSP_1".into() },
        "dr_cardio_surg" => UserProfile { user_id: "u6".into(), name: "Dr. Zeta (Cardiac Surgeon)".into(), role: UserRole::SpBKV, primary_hospital_id: "HOSP_1".into() },

        "dr_psych" => UserProfile { user_id: "u7".into(), name: "Dr. Eta (Psychiatrist)".into(), role: UserRole::SpKJ, primary_hospital_id: "HOSP_1".into() },
        "dr_cardio" => UserProfile { user_id: "u8".into(), name: "Dr. Theta (Cardiologist)".into(), role: UserRole::Cardiologist, primary_hospital_id: "HOSP_1".into() },
        "dr_onco" => UserProfile { user_id: "u9".into(), name: "Dr. Iota (Oncologist)".into(), role: UserRole::Oncologist, primary_hospital_id: "HOSP_1".into() },
        "dr_obgyn" => UserProfile { user_id: "u10".into(), name: "Dr. Kappa (ObGyn)".into(), role: UserRole::SpOG, primary_hospital_id: "HOSP_1".into() },
        "dr_radio" => UserProfile { user_id: "u11".into(), name: "Dr. Lambda (Radiologist)".into(), role: UserRole::Radiologist, primary_hospital_id: "HOSP_1".into() },
        "dr_derm" => UserProfile { user_id: "u12".into(), name: "Dr. Mu (Dermatologist)".into(), role: UserRole::SpKK, primary_hospital_id: "HOSP_1".into() },
        "dr_gp" => UserProfile { user_id: "u13".into(), name: "Dr. Nu (GP)".into(), role: UserRole::GP, primary_hospital_id: "HOSP_1".into() },
        "dr_forensic" => UserProfile { user_id: "u14".into(), name: "Dr. Xi (Forensic)".into(), role: UserRole::ForensicMed, primary_hospital_id: "HOSP_1".into() },

        "exec_cfo" => UserProfile { user_id: "u100".into(), name: "Mr. Theta (CFO)".into(), role: UserRole::CFO, primary_hospital_id: "HOSP_1".into() },
        "holding_audit" => UserProfile { user_id: "u101".into(), name: "Ms. Iota (Auditor)".into(), role: UserRole::GroupAuditor, primary_hospital_id: "GLOBAL".into() },

        _ => UserProfile { user_id: "u_default".into(), name: "General Clinician".into(), role: UserRole::TemplateClinical, primary_hospital_id: "HOSP_1".into() }
    }
}
