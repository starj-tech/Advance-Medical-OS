variable "project_id" {
  description = "The ID of the GCP project"
  type        = string
}

variable "region" {
  description = "The default GCP region for the infrastructure"
  type        = string
  default     = "asia-southeast1" # Jakarta region for low latency in Indonesia
}

variable "zone" {
  description = "The default GCP zone"
  type        = string
  default     = "asia-southeast1-a"
}

variable "db_password" {
  description = "The password for the PostgreSQL master user"
  type        = string
  sensitive   = true
}

variable "environment" {
  description = "The deployment environment (e.g. staging, production)"
  type        = string
  default     = "staging"
}
