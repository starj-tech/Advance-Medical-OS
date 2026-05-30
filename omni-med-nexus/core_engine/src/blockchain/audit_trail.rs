use super::block::Block;

#[derive(Debug, Clone)]
pub struct Blockchain {
    pub chain: Vec<Block>,
}

impl Default for Blockchain {
    fn default() -> Self {
        Self::new()
    }
}

impl Blockchain {
    pub fn new() -> Self {
        let mut blockchain = Blockchain { chain: Vec::new() };
        blockchain.create_genesis_block();
        blockchain
    }

    fn create_genesis_block(&mut self) {
        let genesis_block = Block::new(
            0,
            "SYSTEM".to_string(),
            "SYSTEM_INIT".to_string(),
            "SYSTEM_ADMIN".to_string(),
            "0".to_string(),
        );
        self.chain.push(genesis_block);
    }

    pub fn get_latest_block(&self) -> Option<&Block> {
        self.chain.last()
    }

    pub fn add_audit_record(&mut self, patient_id: String, action: String, doctor_id: String) {
        let previous_block = self.get_latest_block().unwrap();
        let new_block = Block::new(
            previous_block.index + 1,
            patient_id,
            action,
            doctor_id,
            previous_block.hash.clone(),
        );
        self.chain.push(new_block);
    }

    pub fn is_chain_valid(&self) -> bool {
        for i in 1..self.chain.len() {
            let current_block = &self.chain[i];
            let previous_block = &self.chain[i - 1];

            if current_block.hash != current_block.calculate_hash() {
                return false;
            }

            if current_block.previous_hash != previous_block.hash {
                return false;
            }
        }
        true
    }
}
