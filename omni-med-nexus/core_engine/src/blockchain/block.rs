use chrono::Utc;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Block {
    pub index: u64,
    pub timestamp: i64,
    pub patient_id: String,
    pub action: String, // e.g., "VIEW_RECORD", "UPDATE_DIAGNOSIS"
    pub doctor_id: String,
    pub previous_hash: String,
    pub hash: String,
}

impl Block {
    pub fn new(
        index: u64,
        patient_id: String,
        action: String,
        doctor_id: String,
        previous_hash: String,
    ) -> Self {
        let timestamp = Utc::now().timestamp();
        let mut block = Block {
            index,
            timestamp,
            patient_id,
            action,
            doctor_id,
            previous_hash,
            hash: String::new(),
        };
        block.hash = block.calculate_hash();
        block
    }

    pub fn calculate_hash(&self) -> String {
        let mut hasher = Sha256::new();
        let data = format!(
            "{}{}{}{}{}{}",
            self.index,
            self.timestamp,
            self.patient_id,
            self.action,
            self.doctor_id,
            self.previous_hash
        );
        hasher.update(data);
        let result = hasher.finalize();
        let mut hash_string = String::new();
        for byte in result {
            hash_string.push_str(&format!("{:02x}", byte));
        }
        hash_string
    }
}
