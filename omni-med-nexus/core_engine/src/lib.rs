pub mod blockchain;
pub mod database;
pub mod security;

#[cfg(test)]
mod tests {
    use super::blockchain::audit_trail::Blockchain;
    use super::security::encryption::SecurityManager;

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

    #[test]
    fn test_aes_256_gcm_encryption_decryption() {
        let sm = SecurityManager::new();
        let sensitive_clinical_data = "PATIENT_SSN:123456789|DIAGNOSIS:ACUTE_CARDIAC_ARREST";

        let encrypted = sm.encrypt(sensitive_clinical_data).expect("Encryption failed");

        // Assert ciphertext is completely different and obscures length somewhat (with nonce + tag)
        assert_ne!(sensitive_clinical_data.as_bytes(), encrypted.as_slice());

        let decrypted = sm.decrypt(&encrypted).expect("Decryption failed");

        assert_eq!(sensitive_clinical_data, decrypted);
    }
}
