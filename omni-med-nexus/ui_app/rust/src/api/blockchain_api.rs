use core_engine::blockchain::audit_trail::Blockchain;
use std::sync::{Arc, Mutex};
use flutter_rust_bridge::frb;
use lazy_static::lazy_static;

lazy_static! {
    static ref GLOBAL_BLOCKCHAIN: Arc<Mutex<Blockchain>> = Arc::new(Mutex::new(Blockchain::new()));
}

#[frb(sync)]
pub fn add_audit_record(patient_id: String, action: String, doctor_id: String) -> String {
    let mut bc = GLOBAL_BLOCKCHAIN.lock().unwrap();
    bc.add_audit_record(patient_id, action, doctor_id);
    let latest_block = bc.get_latest_block().unwrap();
    latest_block.hash.clone()
}

#[frb(sync)]
pub fn validate_blockchain() -> bool {
    let bc = GLOBAL_BLOCKCHAIN.lock().unwrap();
    bc.is_chain_valid()
}

#[frb(sync)]
pub fn get_latest_audit_hash() -> String {
    let bc = GLOBAL_BLOCKCHAIN.lock().unwrap();
    bc.get_latest_block().unwrap().hash.clone()
}

#[frb(sync)]
pub fn get_chain_length() -> usize {
    let bc = GLOBAL_BLOCKCHAIN.lock().unwrap();
    bc.chain.len()
}
