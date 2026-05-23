#!/bin/bash
set -e

NAMESPACE="dynaflow"

# Override any of these by exporting them before running the script.
# If not set, random secure values are generated.
DB_PASS="${DB_PASS:-$(openssl rand -base64 24)}"
REDIS_PASS="${REDIS_PASS:-$(openssl rand -base64 24)}"
MONGO_PASS="${MONGO_PASS:-$(openssl rand -base64 24)}"
MONGO_ROOT_PASS="${MONGO_ROOT_PASS:-$(openssl rand -base64 24)}"
JWT_SECRET="${JWT_SECRET:-$(openssl rand -base64 48)}"
MINIO_ACCESS_KEY="${MINIO_ACCESS_KEY:-$(openssl rand -base64 12 | tr -dc 'A-Za-z0-9' | head -c 16)}"
MINIO_SECRET_KEY="${MINIO_SECRET_KEY:-$(openssl rand -base64 24 | tr -dc 'A-Za-z0-9' | head -c 32)}"
RABBITMQ_PASS="${RABBITMQ_PASS:-$(openssl rand -base64 18 | tr -dc 'A-Za-z0-9' | head -c 24)}"
TIMESCALE_PASS="${TIMESCALE_PASS:-$(openssl rand -base64 24)}"

SECRET_FILE="$(dirname "$0")/dynaflow.secret"
cat > "$SECRET_FILE" <<EOF
DB_PASS=$DB_PASS
REDIS_PASS=$REDIS_PASS
MONGO_PASS=$MONGO_PASS
MONGO_ROOT_PASS=$MONGO_ROOT_PASS
JWT_SECRET=$JWT_SECRET
MINIO_ACCESS_KEY=$MINIO_ACCESS_KEY
MINIO_SECRET_KEY=$MINIO_SECRET_KEY
RABBITMQ_PASS=$RABBITMQ_PASS
TIMESCALE_PASS=$TIMESCALE_PASS
EOF
chmod 600 "$SECRET_FILE"

echo ""
echo "=== Secrets written to $SECRET_FILE ==="
cat "$SECRET_FILE"
echo "========================================"
echo ""

# Function to URL-encode a string
urlencode() {
  local string="$1"
  python3 -c "import urllib.parse; print(urllib.parse.quote('$string', safe=''))"
}

echo "Creating namespace $NAMESPACE..."
kubectl create namespace "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -

# --- PostgreSQL ---
echo "Creating postgres-credentials..."
kubectl create secret generic postgres-credentials \
  --namespace "$NAMESPACE" \
  --from-literal=postgres-password="$DB_PASS" \
  --from-literal=password="$DB_PASS" \
  --dry-run=client -o yaml | kubectl apply -f -

# --- Redis ---
echo "Creating redis-credentials..."
kubectl create secret generic redis-credentials \
  --namespace "$NAMESPACE" \
  --from-literal=redis-password="$REDIS_PASS" \
  --dry-run=client -o yaml | kubectl apply -f -

# --- MongoDB ---
echo "Creating mongodb-credentials..."
kubectl create secret generic mongodb-credentials \
  --namespace "$NAMESPACE" \
  --from-literal=mongodb-root-password="$MONGO_ROOT_PASS" \
  --from-literal=mongodb-passwords="$MONGO_PASS" \
  --dry-run=client -o yaml | kubectl apply -f -

# --- MinIO ---
echo "Creating minio-credentials..."
kubectl create secret generic minio-credentials \
  --namespace "$NAMESPACE" \
  --from-literal=access-key="$MINIO_ACCESS_KEY" \
  --from-literal=secret-key="$MINIO_SECRET_KEY" \
  --dry-run=client -o yaml | kubectl apply -f -

# --- RabbitMQ ---
RABBITMQ_PASS_ENCODED=$(urlencode "$RABBITMQ_PASS")
RABBITMQ_URL="amqp://dynaflow:${RABBITMQ_PASS_ENCODED}@rabbitmq.${NAMESPACE}.svc.cluster.local:5672"
echo "Creating rabbitmq-credentials..."
kubectl create secret generic rabbitmq-credentials \
  --namespace "$NAMESPACE" \
  --from-literal=rabbitmq-password="$RABBITMQ_PASS" \
  --from-literal=rabbitmq-url="$RABBITMQ_URL" \
  --dry-run=client -o yaml | kubectl apply -f -

# --- TimescaleDB ---
echo "Creating timescaledb-credentials..."
kubectl create secret generic timescaledb-credentials \
  --namespace "$NAMESPACE" \
  --from-literal=password="$TIMESCALE_PASS" \
  --dry-run=client -o yaml | kubectl apply -f -

# --- Dynaflow app secrets ---
MONGO_PASS_ENCODED=$(urlencode "$MONGO_PASS")
MONGO_URI="mongodb://dynaflow:${MONGO_PASS_ENCODED}@mongodb.${NAMESPACE}.svc.cluster.local:27017/vehicle?authSource=vehicle"
echo "Creating dynaflow-secrets..."
kubectl create secret generic dynaflow-secrets \
  --namespace "$NAMESPACE" \
  --from-literal=jwt-secret="$JWT_SECRET" \
  --from-literal=mongo-uri="$MONGO_URI" \
  --dry-run=client -o yaml | kubectl apply -f -

echo ""
echo "All secrets applied to namespace $NAMESPACE."

# Usage:
#   Fresh run (generates new passwords):  ./scripts/upload-secrets.sh
#   Reuse existing passwords:             source scripts/dynaflow.secret && ./scripts/upload-secrets.sh
