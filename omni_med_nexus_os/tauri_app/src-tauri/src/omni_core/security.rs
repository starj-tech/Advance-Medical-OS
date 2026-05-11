use aes_gcm::{
    aead::{Aead, KeyInit, OsRng},
    Aes256Gcm, Nonce
};
use rand::RngCore;

// Simulates a hardware-backed local key (Zero-Knowledge)
fn get_local_key() -> [u8; 32] {
    let mut key = [0u8; 32];
    // In production, this loads from a Secure Enclave / Keystore.
    // For now, we mock a static local key.
    for i in 0..32 {
        key[i] = (i % 255) as u8;
    }
    key
}

pub fn encrypt_data(plaintext: &str) -> String {
    let key = get_local_key();
    let cipher = Aes256Gcm::new(&key.into());

    let mut nonce_bytes = [0u8; 12];
    OsRng.fill_bytes(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);

    match cipher.encrypt(nonce, plaintext.as_bytes()) {
        Ok(ciphertext) => {
            // Combine nonce + ciphertext for storage/sync
            let mut combined = nonce_bytes.to_vec();
            combined.extend(ciphertext);
            hex::encode(combined)
        }
        Err(_) => "ENCRYPTION_ERROR".to_string()
    }
}

pub fn decrypt_data(hex_combined: &str) -> String {
    let combined = hex::decode(hex_combined).unwrap_or_default();
    if combined.len() < 12 { return "DECRYPTION_ERROR".to_string(); }

    let key = get_local_key();
    let cipher = Aes256Gcm::new(&key.into());
    let nonce = Nonce::from_slice(&combined[..12]);
    let ciphertext = &combined[12..];

    match cipher.decrypt(nonce, ciphertext) {
        Ok(plaintext) => String::from_utf8(plaintext).unwrap_or_else(|_| "DECRYPTION_ERROR".to_string()),
        Err(_) => "DECRYPTION_ERROR".to_string()
    }
}
