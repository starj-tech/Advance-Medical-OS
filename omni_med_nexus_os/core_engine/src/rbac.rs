use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum UserRole {
    // Clinical Dimension
    SpEM,       // Emergency Medicine (ER)
    SpBS,       // Neurosurgeon
    SpKJ,       // Psychiatrist
    TemplateClinical, // Placeholder for other clinical roles

    // Operational Dimension
    CEO,
    CFO,

    // Holding Dimension
    GroupAuditor,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserProfile {
    pub user_id: String,
    pub name: String,
    pub role: UserRole,
    pub primary_hospital_id: String,
}

pub fn login_mock(username: &str) -> UserProfile {
    // Simulates a login returning the user's highly specific RBAC profile
    match username {
        "dr_er" => UserProfile {
            user_id: "u1".into(),
            name: "Dr. Alpha (ER)".into(),
            role: UserRole::SpEM,
            primary_hospital_id: "HOSP_1".into(),
        },
        "dr_neuro" => UserProfile {
            user_id: "u2".into(),
            name: "Dr. Beta (Neuro)".into(),
            role: UserRole::SpBS,
            primary_hospital_id: "HOSP_1".into(),
        },
        "dr_psych" => UserProfile {
            user_id: "u3".into(),
            name: "Dr. Gamma (Psych)".into(),
            role: UserRole::SpKJ,
            primary_hospital_id: "HOSP_1".into(),
        },
        "exec_cfo" => UserProfile {
            user_id: "u4".into(),
            name: "Mr. Delta (CFO)".into(),
            role: UserRole::CFO,
            primary_hospital_id: "HOSP_1".into(),
        },
        "holding_audit" => UserProfile {
            user_id: "u5".into(),
            name: "Ms. Epsilon (Auditor)".into(),
            role: UserRole::GroupAuditor,
            primary_hospital_id: "GLOBAL".into(),
        },
        _ => UserProfile {
            user_id: "u_default".into(),
            name: "General Clinician".into(),
            role: UserRole::TemplateClinical,
            primary_hospital_id: "HOSP_1".into(),
        }
    }
}
