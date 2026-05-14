# --- CONFIGURATION DU RÉSEAU ---
resource "google_compute_network" "vpc" {
  name                    = "ecu-poc-vpc"
  auto_create_subnetworks = false
}

resource "google_compute_subnetwork" "subnet" {
  name          = "ecu-poc-subnet"
  region        = "europe-west1"
  network       = google_compute_network.vpc.name
  ip_cidr_range = "10.0.0.0/24"
}

# --- CONFIGURATION DU CLUSTER GKE ---
resource "google_container_cluster" "primary" {
  name     = "ecu-app-cluster"
  location = "europe-west1-b" # Zonal = Réduction des coûts de management

  network    = google_compute_network.vpc.name
  subnetwork = google_compute_subnetwork.subnet.name

  # On supprime le pool par défaut pour créer le nôtre (en Spot)
  remove_default_node_pool = true
  initial_node_count       = 1
}

# --- CONFIGURATION DES NODES (HEAVY POC - SPOT) ---
resource "google_container_node_pool" "spot_nodes" {
  name       = "heavy-poc-pool"
  location   = "europe-west1-b"
  cluster    = google_container_cluster.primary.name
  node_count = 2 # 2 machines pour tolérance aux pannes

  node_config {
    # UPGRADE: 4 vCPUs, 16GB RAM par machine
    # Nécessaire pour faire tourner Postgres, Mongo, Timescale, MinIO, RabbitMQ et l'observabilité
    machine_type = "e2-standard-4" 
    
    # RÉDUCTION DE COÛT MAJEURE : Garde le prix autour de ~45$/mois au lieu de ~150$
    spot         = true  
    
    # UPGRADE: 80 Go pour stocker les bases de données, les logs Loki et les binaires MinIO
    disk_size_gb = 80
    disk_type    = "pd-balanced"

    oauth_scopes = [
      "https://www.googleapis.com/auth/cloud-platform"
    ]

    labels = {
      env          = "poc-full-arch"
      architecture = "microservices"
    }
  }
}

# --- ADRESSE IP POUR VOTRE DOMAINE / API GATEWAY ---
resource "google_compute_address" "static_ip" {
  name   = "ecu-api-gateway-ip"
  region = "europe-west1"
}

# --- SORTIE (OUTPUT) ---
# Affiche l'IP à lier à ton nom de domaine dans ton DNS
output "ingress_ip" {
  description = "Adresse IP publique pour l'API Gateway"
  value       = google_compute_address.static_ip.address
}