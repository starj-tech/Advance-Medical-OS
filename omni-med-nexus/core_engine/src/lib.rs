pub mod blockchain;

#[cfg(test)]
mod tests {
    use super::blockchain::audit_trail::Blockchain;

    #[test]
    fn it_creates_genesis_block() {
        let bc = Blockchain::new();
        assert_eq!(bc.chain.len(), 1);
        assert_eq!(bc.chain[0].action, "SYSTEM_INIT");
    }

    #[test]
    fn it_adds_record_and_validates() {
        let mut bc = Blockchain::new();
        bc.add_audit_record("PAT-123".to_string(), "UPDATE_EWS".to_string(), "DOC-456".to_string());

        assert_eq!(bc.chain.len(), 2);
        assert!(bc.is_chain_valid());
    }
}
