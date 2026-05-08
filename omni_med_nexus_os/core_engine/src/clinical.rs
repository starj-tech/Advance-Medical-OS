pub fn ghost_scribe_mock_process(audio_path: &str) -> String { format!("Processed audio '{}': \nDiagnosis: Mild Hypertension. \nNotes: Patient reported headaches.", audio_path) }
pub fn get_diagnostic_overlay() -> Vec<f64> { vec![120.0, 122.0, 118.0, 125.0, 130.0, 128.0] }
pub fn one_tap_prescription(drug: &str) -> String {
    if drug == "Aspirin" { "Aspirin in stock: 150 units. Dispensing 1 unit.".to_string() } else { format!("{} out of stock. Suggested alternative: Ibuprofen.", drug) }
}
