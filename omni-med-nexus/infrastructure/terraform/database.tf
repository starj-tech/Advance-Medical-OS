# Private IP allocation for Cloud SQL
resource "google_compute_global_address" "private_ip_address" {
  name          = "omni-med-db-private-ip"
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 16
  network       = google_compute_network.omni_med_vpc.id
}

resource "google_service_networking_connection" "private_vpc_connection" {
  network                 = google_compute_network.omni_med_vpc.id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.private_ip_address.name]
}

# Cloud SQL PostgreSQL Instance with High Availability (Failover) and Auto-Backup
resource "google_sql_database_instance" "omni_med_postgres" {
  name             = "omni-med-postgres-cluster"
  database_version = "POSTGRES_15"
  region           = var.region

  depends_on = [google_service_networking_connection.private_vpc_connection]

  settings {
    tier              = "db-custom-4-15360" # 4 vCPU, 15GB RAM (Enterprise baseline)
    availability_type = "REGIONAL"          # Enables failover across zones

    ip_configuration {
      ipv4_enabled    = false
      private_network = google_compute_network.omni_med_vpc.id
    }

    backup_configuration {
      enabled                        = true
      start_time                     = "17:00" # 00:00 WIB (Midnight backup)
      point_in_time_recovery_enabled = true    # Enables restoration to any exact second
    }

    maintenance_window {
      day          = 7  # Sunday
      hour         = 18 # 01:00 WIB
      update_track = "stable"
    }
  }
}

# Master Database Account
resource "google_sql_user" "db_admin" {
  name     = "nexus_admin"
  instance = google_sql_database_instance.omni_med_postgres.name
  password = var.db_password
}
