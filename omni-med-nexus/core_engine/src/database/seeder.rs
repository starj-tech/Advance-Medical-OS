use sqlx::{Pool, Postgres};
use log::info;

pub async fn seed_master_data(pool: &Pool<Postgres>) -> Result<(), sqlx::Error> {
    info!("Seeding master data tables...");

    // Create tables
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS icd10_codes (
            code VARCHAR(10) PRIMARY KEY,
            description TEXT NOT NULL
        )"
    )
    .execute(pool)
    .await?;

    sqlx::query(
        "CREATE TABLE IF NOT EXISTS formulary (
            id SERIAL PRIMARY KEY,
            medication_name VARCHAR(255) NOT NULL,
            dosage VARCHAR(100) NOT NULL,
            stock_quantity INTEGER NOT NULL
        )"
    )
    .execute(pool)
    .await?;

    sqlx::query(
        "CREATE TABLE IF NOT EXISTS patients (
            id VARCHAR(50) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            encrypted_ssn TEXT NOT NULL,
            encrypted_medical_history TEXT NOT NULL
        )"
    )
    .execute(pool)
    .await?;

    // Seed ICD-10 Data
    sqlx::query(
        "INSERT INTO icd10_codes (code, description) VALUES
        ('J00', 'Acute nasopharyngitis [common cold]'),
        ('I10', 'Essential (primary) hypertension'),
        ('E11', 'Type 2 diabetes mellitus')
        ON CONFLICT (code) DO NOTHING"
    )
    .execute(pool)
    .await?;

    // Seed Formulary Data
    sqlx::query(
        "INSERT INTO formulary (medication_name, dosage, stock_quantity) VALUES
        ('Paracetamol', '500mg', 10000),
        ('Amoxicillin', '250mg', 5000),
        ('Metformin', '500mg', 8000)
        ON CONFLICT DO NOTHING" // Simplified for seed demo
    )
    .execute(pool)
    .await?;

    info!("Master data seeded successfully.");
    Ok(())
}
