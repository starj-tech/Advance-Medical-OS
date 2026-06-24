use aes_gcm::{
    Aes256Gcm, Key, Nonce,
    aead::{Aead, AeadCore, KeyInit, OsRng},
};

pub struct SecurityManager {
    key: Key<Aes256Gcm>,
}

impl Default for SecurityManager {
    fn default() -> Self {
        Self::new()
    }
}

impl SecurityManager {
    pub fn new() -> Self {
        // In production, this key must be loaded from a secure environment variable or KMS
        let key = Aes256Gcm::generate_key(OsRng);
        SecurityManager { key }
    }

    /// Used for instantiating with a known secure key (e.g. from environment)
    pub fn from_key(key_bytes: &[u8; 32]) -> Self {
        SecurityManager {
            key: *Key::<Aes256Gcm>::from_slice(key_bytes),
        }
    }

    pub fn encrypt(&self, plaintext: &str) -> Result<Vec<u8>, String> {
        let cipher = Aes256Gcm::new(&self.key);
        let nonce = Aes256Gcm::generate_nonce(&mut OsRng); // 96-bits; unique per message

        let mut encrypted_data = match cipher.encrypt(&nonce, plaintext.as_bytes()) {
            Ok(data) => data,
            Err(e) => return Err(format!("Encryption failed: {}", e)),
        };

        // Prepend nonce to the encrypted payload to decrypt it later
        let mut payload = nonce.to_vec();
        payload.append(&mut encrypted_data);

        Ok(payload)
    }

    pub fn decrypt(&self, payload: &[u8]) -> Result<String, String> {
        if payload.len() < 12 {
            return Err("Payload too short".to_string());
        }

        let (nonce_bytes, ciphertext) = payload.split_at(12);
        let nonce = Nonce::from_slice(nonce_bytes);
        let cipher = Aes256Gcm::new(&self.key);

        match cipher.decrypt(nonce, ciphertext) {
            Ok(plaintext_bytes) => match String::from_utf8(plaintext_bytes) {
                Ok(text) => Ok(text),
                Err(_) => Err("Invalid UTF-8 in decrypted data".to_string()),
            },
            Err(_) => Err("Decryption failed. Invalid key or corrupted data.".to_string()),
        }
    }
}
