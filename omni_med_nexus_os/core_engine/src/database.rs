use rusqlite::{Connection, Result};
pub struct EdgeDatabase { pub conn: Connection }
impl EdgeDatabase {
    pub fn new(db_path: &str) -> Result<Self> {
        let conn = Connection::open(db_path)?;
        let db = EdgeDatabase { conn };
        db.initialize_schema()?;
        Ok(db)
    }
    fn initialize_schema(&self) -> Result<()> {
        self.conn.execute("CREATE TABLE IF NOT EXISTS patients_global (id INTEGER PRIMARY KEY AUTOINCREMENT, unified_id TEXT NOT NULL UNIQUE, name TEXT NOT NULL, dob DATE NOT NULL)", [])?;
        self.conn.execute("CREATE TABLE IF NOT EXISTS hospitals (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, region TEXT NOT NULL)", [])?;
        self.conn.execute("CREATE TABLE IF NOT EXISTS inventory (id INTEGER PRIMARY KEY AUTOINCREMENT, hospital_id INTEGER NOT NULL, item_name TEXT NOT NULL, efficacy_class TEXT, quantity INTEGER NOT NULL, expiry_date DATE NOT NULL, FOREIGN KEY(hospital_id) REFERENCES hospitals(id))", [])?;
        self.conn.execute("CREATE TABLE IF NOT EXISTS billing (id INTEGER PRIMARY KEY AUTOINCREMENT, patient_id INTEGER NOT NULL, hospital_id INTEGER NOT NULL, amount REAL NOT NULL, description TEXT NOT NULL, is_audited BOOLEAN DEFAULT FALSE, FOREIGN KEY(patient_id) REFERENCES patients_global(id), FOREIGN KEY(hospital_id) REFERENCES hospitals(id))", [])?;
        self.conn.execute("CREATE TABLE IF NOT EXISTS asset_usage_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, patient_id INTEGER NOT NULL, asset_name TEXT NOT NULL, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP)", [])?;
        self.conn.execute("CREATE TABLE IF NOT EXISTS assets_3d_locations (id INTEGER PRIMARY KEY AUTOINCREMENT, hospital_id INTEGER NOT NULL, asset_name TEXT NOT NULL, asset_type TEXT NOT NULL, pos_x REAL NOT NULL, pos_y REAL NOT NULL, pos_z REAL NOT NULL, status TEXT NOT NULL)", [])?;
        self.conn.execute("CREATE TABLE IF NOT EXISTS logs (id INTEGER PRIMARY KEY AUTOINCREMENT, action TEXT NOT NULL, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP)", [])?;
        self.conn.execute("CREATE TABLE IF NOT EXISTS vitals (id INTEGER PRIMARY KEY AUTOINCREMENT, patient_id INTEGER NOT NULL, heart_rate REAL, blood_pressure TEXT, temp REAL, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(patient_id) REFERENCES patients_global(id))", [])?;
        self.conn.execute("CREATE TABLE IF NOT EXISTS allergies_and_conditions (id INTEGER PRIMARY KEY AUTOINCREMENT, patient_id INTEGER NOT NULL, condition TEXT NOT NULL, severity TEXT, FOREIGN KEY(patient_id) REFERENCES patients_global(id))", [])?;
        Ok(())
    }
}
