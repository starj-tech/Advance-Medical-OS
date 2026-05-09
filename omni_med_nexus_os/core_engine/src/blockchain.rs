use sha2::{Sha256, Digest};
use chrono::Utc;
use serde::{Serialize, Deserialize};
use std::sync::Mutex;
use once_cell::sync::Lazy;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Block {
    pub index: u64,
    pub timestamp: i64,
    pub data: String,
    pub previous_hash: String,
    pub hash: String,
}

impl Block {
    pub fn new(index: u64, data: String, previous_hash: String) -> Self {
        let timestamp = Utc::now().timestamp();
        let mut block = Block {
            index,
            timestamp,
            data,
            previous_hash,
            hash: String::new(),
        };
        block.hash = block.calculate_hash();
        block
    }

    pub fn calculate_hash(&self) -> String {
        let mut hasher = Sha256::new();
        let input = format!("{}{}{}{}", self.index, self.timestamp, self.data, self.previous_hash);
        hasher.update(input);
        format!("{:x}", hasher.finalize())
    }
}

pub struct Blockchain {
    pub chain: Vec<Block>,
}

impl Blockchain {
    pub fn new() -> Self {
        let genesis_block = Block::new(0, String::from("Omni-Med Nexus OS: Genesis Block"), String::from("0"));
        Blockchain {
            chain: vec![genesis_block],
        }
    }

    pub fn add_block(&mut self, data: String) {
        let previous_block = self.chain.last().unwrap();
        let new_block = Block::new(
            previous_block.index + 1,
            data,
            previous_block.hash.clone(),
        );
        self.chain.push(new_block);
    }
}

// Global Blockchain Instance for the Prototype
pub static LEDGER: Lazy<Mutex<Blockchain>> = Lazy::new(|| Mutex::new(Blockchain::new()));

pub fn record_audit_trail(action: &str, details: &str) {
    let mut ledger = LEDGER.lock().unwrap();
    let data = format!("Action: {} | Details: {}", action, details);
    ledger.add_block(data);
}

pub fn get_audit_trail() -> Vec<String> {
    let ledger = LEDGER.lock().unwrap();
    ledger.chain.iter().map(|b| format!("IDX: {} | Hash: {} | Data: {}", b.index, &b.hash[..16], b.data)).collect()
}
