#!/bin/bash
set -e

NAMESPACE="dynaflow"
DB_PASS="StrongDBPassword123!"
REDIS_PASS="StrongRedisPassword123!"

echo "Creating namespace $NAMESPACE if it doesn't exist..."
kubectl create namespace $NAMESPACE --dry-run=client -o yaml | kubectl apply -f -

echo "Creating Postgres Helm credentials..."
kubectl create secret generic postgres-credentials \
  --namespace $NAMESPACE \
  --from-literal=postgres-password="$DB_PASS" \
  --from-literal=password="$DB_PASS" \
  --dry-run=client -o yaml | kubectl apply -f -

echo "Creating Redis Helm credentials..."
kubectl create secret generic redis-credentials \
  --namespace $NAMESPACE \
  --from-literal=redis-password="$REDIS_PASS" \
  --dry-run=client -o yaml | kubectl apply -f -

echo "Creating Dynaflow services configuration secrets..."
# Note: Services will connect to these databases
kubectl create secret generic dynaflow-secrets \
  --namespace $NAMESPACE \
  --from-literal=auth-db-url="postgresql://dynaflow:${DB_PASS}@postgres-db-postgresql:5432/dynaflow_auth" \
  --from-literal=access-db-url="postgresql://dynaflow:${DB_PASS}@postgres-db-postgresql:5432/dynaflow_access" \
  --from-literal=site-db-url="postgresql://dynaflow:${DB_PASS}@postgres-db-postgresql:5432/dynaflow_site" \
  --from-literal=redis-url="redis://:${REDIS_PASS}@redis-master:6379" \
  --dry-run=client -o yaml | kubectl apply -f -

echo "Secrets uploaded successfully."
