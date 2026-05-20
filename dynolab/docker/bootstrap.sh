#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

source "$SCRIPT_DIR/.env"

run_sql() {
  local container="$1"
  local db="$2"
  local sql_file="$3"

  if [ ! -f "$sql_file" ]; then
    echo "[skip] $sql_file not found"
    return
  fi

  echo "[bootstrap] $container <- $sql_file"
  docker exec -i "$container" psql \
    -U "$POSTGRES_USER" \
    -d "$db" \
    < "$sql_file"
}

run_sql "dynolab-pg-auth"    "$PG_AUTH_DB"    "$REPO_ROOT/services/auth/db_create.sql"
run_sql "dynolab-pg-access"  "$PG_ACCESS_DB"  "$REPO_ROOT/services/access/db_create.sql"
run_sql "dynolab-pg-site"    "$PG_SITE_DB"    "$REPO_ROOT/services/site/db_create.sql"
run_sql "dynolab-pg-client-vehicle" "$PG_CLIENT_VEHICLE_DB" "$REPO_ROOT/services/client-vehicle/db_create.sql"
run_sql "dynolab-pg-map"      "$PG_MAP_DB"      "$REPO_ROOT/services/map/db_create.sql"
run_sql "dynolab-pg-workshop" "$PG_WORKSHOP_DB" "$REPO_ROOT/services/workshop/db_create.sql"

echo "[bootstrap] done"
