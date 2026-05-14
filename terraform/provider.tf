# --- CONFIGURATION DU PROVIDER ---
terraform {
  required_version = ">= 1.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0" # Utilise la version la plus stable de 2026
    }
  }

  # Optionnel : Si tu veux stocker ton état Terraform dans le cloud 
  # (Utile si tu travailles à plusieurs, sinon retire ce bloc pour un stockage local)
  # backend "gcs" {
  #   bucket  = "nom-de-votre-bucket-tfstate"
  #   prefix  = "terraform/state"
  # }
}

provider "google" {
  project = "tfe-microservice-api"
  region  = "europe-west1"
  zone    = "europe-west1-b"
}