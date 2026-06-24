use log::info;
use sqlx::{Pool, Postgres};

pub async fn seed_master_data(pool: &Pool<Postgres>) -> Result<(), sqlx::Error> {
    info!("Seeding master data tables...");

    // Create tables
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS icd10_codes (
            code VARCHAR(10) PRIMARY KEY,
            description TEXT NOT NULL
        )",
    )
    .execute(pool)
    .await?;

    sqlx::query(
        "CREATE TABLE IF NOT EXISTS formulary (
            id SERIAL PRIMARY KEY,
            medication_name VARCHAR(255) NOT NULL,
            dosage VARCHAR(100) NOT NULL,
            stock_quantity INTEGER NOT NULL
        )",
    )
    .execute(pool)
    .await?;

    sqlx::query(
        "CREATE TABLE IF NOT EXISTS patients (
            id VARCHAR(50) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            encrypted_ssn TEXT NOT NULL,
            encrypted_medical_history TEXT NOT NULL
        )",
    )
    .execute(pool)
    .await?;

    // Added: Tarif Tindakan Dasar (Medical Procedure Tariffs)
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS tariffs (
            id SERIAL PRIMARY KEY,
            procedure_code VARCHAR(50) NOT NULL UNIQUE,
            procedure_name VARCHAR(255) NOT NULL,
            base_price NUMERIC(10, 2) NOT NULL
        )",
    )
    .execute(pool)
    .await?;

    // Seed ICD-10 Data
    sqlx::query(
        "INSERT INTO icd10_codes (code, description) VALUES
        ('J00', 'Acute nasopharyngitis [common cold]'),
        ('I10', 'Essential (primary) hypertension'),
        ('E11', 'Type 2 diabetes mellitus')
        ON CONFLICT (code) DO NOTHING",
    )
    .execute(pool)
    .await?;

    // Seed Formulary Data
    sqlx::query(
        "INSERT INTO formulary (medication_name, dosage, stock_quantity) VALUES
        ('Paracetamol', '500mg', 10000),
        ('Amoxicillin', '250mg', 5000),
        ('Metformin', '500mg', 8000)
        ON CONFLICT DO NOTHING",
    )
    .execute(pool)
    .await?;

    // Seed Tariff Data
    sqlx::query(
        "INSERT INTO tariffs (procedure_code, procedure_name, base_price) VALUES
        ('CON-01', 'General Practitioner Consultation', 150000.00),
        ('CON-02', 'Specialist Consultation', 350000.00),
        ('ER-01', 'Emergency Room Basic Admission', 500000.00),
        ('LAB-01', 'Complete Blood Count (CBC)', 85000.00)
        ON CONFLICT (procedure_code) DO NOTHING",
    )
    .execute(pool)
    .await?;

    info!("Master data (including Tariffs) seeded successfully.");
    Ok(())
}
