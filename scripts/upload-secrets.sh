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

SECRET_FILE="$(dirname "$0")/dynaflow.secret"
cat > "$SECRET_FILE" <<EOF
DB_PASS=$DB_PASS
REDIS_PASS=$REDIS_PASS
MONGO_PASS=$MONGO_PASS
MONGO_ROOT_PASS=$MONGO_ROOT_PASS
JWT_SECRET=$JWT_SECRET
EOF
chmod 600 "$SECRET_FILE"

echo ""
echo "=== Secrets written to $SECRET_FILE ==="
cat "$SECRET_FILE"
echo "========================================"
echo ""

echo "Creating namespace $NAMESPACE..."
kubectl create namespace "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -

# --- PostgreSQL (Bitnami chart) ---
# Keys: postgres-password (admin), password (dynaflow user)
echo "Creating postgres-credentials..."
kubectl create secret generic postgres-credentials \
  --namespace "$NAMESPACE" \
  --from-literal=postgres-password="$DB_PASS" \
  --from-literal=password="$DB_PASS" \
  --dry-run=client -o yaml | kubectl apply -f -

# --- Redis (Bitnami chart) ---
echo "Creating redis-credentials..."
kubectl create secret generic redis-credentials \
  --namespace "$NAMESPACE" \
  --from-literal=redis-password="$REDIS_PASS" \
  --dry-run=client -o yaml | kubectl apply -f -

# --- MongoDB (Bitnami chart) ---
# mongodb-root-password: admin root password
# mongodb-passwords:     comma-separated user passwords matching auth.usernames in values
echo "Creating mongodb-credentials..."
kubectl create secret generic mongodb-credentials \
  --namespace "$NAMESPACE" \
  --from-literal=mongodb-root-password="$MONGO_ROOT_PASS" \
  --from-literal=mongodb-passwords="$MONGO_PASS" \
  --dry-run=client -o yaml | kubectl apply -f -

# --- Dynaflow app secrets ---
# jwt-secret: signing key for auth service
# mongo-uri:  full connection string for vehicle service
MONGO_URI="mongodb://dynaflow:${MONGO_PASS}@mongodb.${NAMESPACE}.svc.cluster.local:27017/vehicle?authSource=vehicle"
echo "Creating dynaflow-secrets..."
kubectl create secret generic dynaflow-secrets \
  --namespace "$NAMESPACE" \
  --from-literal=jwt-secret="$JWT_SECRET" \
  --from-literal=mongo-uri="$MONGO_URI" \
  --dry-run=client -o yaml | kubectl apply -f -

echo ""
echo "All secrets applied to namespace $NAMESPACE."

# source scripts/dynaflow.secret && ./scripts/upload-secrets.sh
