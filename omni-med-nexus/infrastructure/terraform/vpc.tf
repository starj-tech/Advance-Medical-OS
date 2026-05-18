# Virtual Private Cloud (VPC) for complete isolation
resource "google_compute_network" "omni_med_vpc" {
  name                    = "omni-med-vpc"
  auto_create_subnetworks = false
}

resource "google_compute_subnetwork" "omni_med_subnet" {
  name          = "omni-med-subnet"
  ip_cidr_range = "10.0.0.0/16"
  region        = var.region
  network       = google_compute_network.omni_med_vpc.id
}

# Firewall to block all ingress by default, only allow specific ports
resource "google_compute_firewall" "allow_internal" {
  name    = "omni-med-allow-internal"
  network = google_compute_network.omni_med_vpc.name

  allow {
    protocol = "tcp"
    ports    = ["0-65535"]
  }
  allow {
    protocol = "udp"
    ports    = ["0-65535"]
  }
  allow {
    protocol = "icmp"
  }

  source_ranges = ["10.0.0.0/16"]
}
