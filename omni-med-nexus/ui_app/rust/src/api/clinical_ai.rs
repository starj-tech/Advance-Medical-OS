use flutter_rust_bridge::frb;

#[frb(sync)]
pub fn simulate_semantic_search(query: String) -> Vec<String> {
    // In a real local-first app, this would query the local Qdrant container/instance.
    // For this prototype, we simulate the vector distance response.
    let q = query.to_lowercase();
    let mut results = Vec::new();

    if q.contains("headache") || q.contains("migraine") {
        results.push("Possible Tension Headache (Similarity: 0.92)".to_string());
        results.push("Dehydration (Similarity: 0.85)".to_string());
    } else if q.contains("fever") {
        results.push("Viral Infection (Similarity: 0.89)".to_string());
        results.push("Influenza (Similarity: 0.82)".to_string());
    } else {
        results.push(format!("AI Semantic matching for '{}' (Similarity: 0.77)", query));
        results.push("General Observation (Similarity: 0.65)".to_string());
    }

    results
}
