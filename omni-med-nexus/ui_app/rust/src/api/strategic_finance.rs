use flutter_rust_bridge::frb;

#[derive(Clone, Debug)]
pub struct FinanceReport {
    pub total_revenue: f64,
    pub pending_claims: f64,
    pub department_expenses: f64,
}

#[frb(sync)]
pub fn get_financial_summary() -> FinanceReport {
    // Simulated Postgres query aggregation for local-first analytics
    FinanceReport {
        total_revenue: 1250000.0,
        pending_claims: 320000.0,
        department_expenses: 450000.0,
    }
}
