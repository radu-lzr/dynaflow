# DynoLab — Architecture Reference

> Ce document est la référence complète de l'architecture de la plateforme DynoLab.
> Il sert de guide pour le développement du prototype.

---

## 1. Vue d'ensemble

DynoLab est une plateforme de gestion pour un réseau de préparateurs automobile (reprogrammation ECU, passages au banc de puissance). L'architecture est une API en microservices construite en **TypeScript** avec **Fastify**, organisée en **monorepo pnpm workspaces**.

### Stack technique

| Élément | Choix |
|---------|-------|
| Langage | TypeScript |
| Framework | Fastify |
| Validation | JSON Schema (Ajv natif Fastify) |
| Documentation API | OpenAPI (YAML) |
| Monorepo | pnpm workspaces |
| Noyau commun | `@dynolab/core` |
| API Gateway | NGINX Gateway Fabric (Kubernetes) |
| Message broker | RabbitMQ |
| Cache / Blacklist JWT | Redis |
| Stockage objets | MinIO (S3-compatible) |
| CI/CD | Docker → Helm → ArgoCD → Kubernetes |
| Monitoring | Prometheus + Grafana |
| Logs | Alloy → Loki → Grafana |

---

## 2. Découpage en services

8 services + monitoring externe.

```mermaid
graph TD
    subgraph "Services transversaux"
        AUTH["Auth Service<br/>PostgreSQL + Redis<br/>Port 4001"]
        ACCESS["Access Service<br/>PostgreSQL<br/>Port 4002"]
        SITE["Site Service<br/>PostgreSQL<br/>Port 4003"]
    end

    subgraph "Services métier"
        VEHICLE["Vehicle Service<br/>MongoDB<br/>Port 4004"]
        CLIENT_VEH["Client Vehicle Service<br/>PostgreSQL<br/>Port 4005"]
        MAP["Map Service<br/>PostgreSQL + MinIO<br/>Port 4006"]
        WORKSHOP["Workshop Service<br/>PostgreSQL<br/>Port 4007"]
        TELEMETRY["Telemetry Service<br/>TimescaleDB<br/>Port 4008"]
    end

    subgraph "Infrastructure"
        GW["NGINX Gateway Fabric<br/>ext_auth subrequests"]
        RMQ["RabbitMQ<br/>Port 5672"]
        REDIS["Redis<br/>Port 6379"]
        MINIO["MinIO<br/>Port 9000"]
    end

    subgraph "Monitoring"
        PROM["Prometheus :9090"]
        GRAF["Grafana :3000"]
        LOKI["Loki :3100"]
    end
```

### Responsabilités par service

| Service | Responsabilité | Base de données | Port |
|---------|---------------|-----------------|------|
| **Auth** | Identité, JWT, refresh tokens, profils utilisateurs (internes + clients), hashage MDP (bcrypt coût 12), MFA ready | PostgreSQL (5432) + Redis (6379) | 4001 |
| **Access** | Rôles dynamiques, permissions (`ressource:action`), permissions directes sur ressource, permissions temporaires avec TTL, scope par site | PostgreSQL (5433) | 4002 |
| **Site** | Sites géographiques, équipements par site, rattachement personnel ↔ site | PostgreSQL (5434) | 4003 |
| **Vehicle** | Catalogue de configurations véhicule (schéma flexible : brand, model, engine_code, ecu_type, fuel_type, stock_hp/torque, specs libre) | MongoDB (27017) | 4004 |
| **Client Vehicle** | Véhicules concrets des clients (VIN, propriétaire, lien config, modifications spécifiques) | PostgreSQL (5435) | 4005 |
| **Map** | Bibliothèque de cartographies, versioning, statuts (draft/in_development/validated/revoked), association map ↔ config véhicule, fichiers binaires sur MinIO | PostgreSQL (5436) + MinIO (9000) | 4006 |
| **Workshop** | Interventions (réception, map appliquée, technicien, statuts, observations), historique des changements de statut | PostgreSQL (5437) | 4007 |
| **Telemetry** | Passages au banc (courbes puissance/couple, métriques OBD, logs véhicule), hypertables TimescaleDB | TimescaleDB (5438) | 4008 |

---

## 3. Communication

### 3.1 Flux synchrones (REST)

La Gateway est **NGINX Gateway Fabric** (Kubernetes). L'authentification et l'autorisation sont gérées via deux **subrequests ext_auth** avant le routage vers le service métier.

```mermaid
sequenceDiagram
    participant C as Client externe
    participant NGX as NGINX Gateway Fabric
    participant A as Auth :4001
    participant AC as Access :4002
    participant S as Service métier

    C->>NGX: HTTPS request + JWT

    rect rgb(198, 246, 213)
        Note over NGX,A: Subrequest 1 — Authentification (interne à /internal/access-check)
        NGX->>A: POST /auth/verify (Authorization: Bearer JWT)
        A->>A: Vérifier JWT (signature + expiry + blacklist Redis)
        A-->>NGX: 200 + X-User-Id, X-Account-Type
        Note over NGX: Si 401 → bloqué, réponse directe au client
    end

    rect rgb(224, 231, 255)
        Note over NGX,AC: Subrequest 2 — Autorisation
        NGX->>AC: POST /access/verify (X-User-Id + X-Original-URI + X-Original-Method)
        AC->>AC: Résoudre permission_code depuis la route
        AC->>AC: Vérifier permissions (rôle + directe + temp)
        AC-->>NGX: 200 + X-User-Id, X-Account-Type
        Note over NGX: Si 403 → bloqué, réponse directe au client
    end

    NGX->>S: HTTP request + X-User-Id + X-Account-Type
    S-->>NGX: Response
    NGX-->>C: HTTPS response
```

**Important** : les services métier ne vérifient ni JWT ni permissions. Ils lisent les headers `X-User-Id` et `X-Account-Type` injectés par NGINX après les subrequests. Ces headers sont fiables car les services sont sur le réseau interne Kubernetes, inaccessible de l'extérieur.

**Implémentation** : les deux subrequests sont chaînés dans une seule location NGINX interne (`/internal/access-check`). Le filtre `access-required` (SnippetsFilter) déclenche cette location, qui elle-même appelle `/internal/auth-verify` (auth-service) avant de passer à `/access/verify` (access-service).

Le **cache des permissions** est géré par l'Access Service lui-même (pas par NGINX). L'invalidation se fait via l'événement RabbitMQ `permission.updated`.

### 3.2 Appels inter-services

```mermaid
graph LR
    WORKSHOP -->|"POST/DELETE /temp-permissions"| ACCESS
    WORKSHOP -->|"POST /bench-sessions"| TELEMETRY
```

Seul le Workshop Service effectue des appels HTTP directs vers d'autres services. Les autres services ne font que stocker des IDs de référence (voir section 7) sans appeler les services cibles.

**Règle** : tous les appels inter-services utilisent HTTP simple sur le réseau interne Kubernetes. Le mTLS est réservé au chemin NGF → Map Service.

### 3.3 Flux asynchrones (RabbitMQ)

Seulement 2 événements :

```mermaid
graph LR
    WORKSHOP -->|"intervention.completed"| RMQ["RabbitMQ"]
    RMQ -->|"consomme"| CLIENT_VEH["Client Vehicle<br/>→ met à jour statut"]

    ACCESS_PUB["Access (publie)"] -->|"permission.updated"| RMQ2["RabbitMQ"]
    RMQ2 -->|"consomme"| ACCESS_SUB["Access (cache interne)<br/>→ invalide cache permissions"]
```

Note : l'événement `permission.updated` est consommé par l'Access Service lui-même pour invalider son cache interne de permissions. NGINX ne gère pas de cache — c'est l'Access Service qui décide de servir depuis le cache ou en temps réel.

### 3.4 Protocole externe vs interne

| Direction | Protocole | Détail |
|-----------|-----------|--------|
| Client → NGINX Gateway | HTTPS (TLS terminé par NGINX) | REST / JSON |
| NGINX → Auth (subrequest interne) | HTTP interne | Vérification JWT via `/auth/verify` |
| NGINX → Access (subrequest interne) | HTTP interne | Vérification permissions via `/access/verify` |
| NGINX → Services métier (sauf Map) | HTTP interne | REST / JSON + headers X-User-Id, X-Account-Type |
| NGINX → Map Service | mTLS | Certificat client NGF requis (port 3443) |
| Workshop → Access | HTTP interne | Gestion des permissions temporaires |
| Workshop → Telemetry | HTTP interne | Création de sessions banc |
| Événements | AMQP (RabbitMQ) | Pub/sub |

---

## 4. Sécurité — 6 couches

### Couche 1 : Réseau

```mermaid
graph TD
    subgraph "Réseau externe"
        CLIENT["Client web/mobile"]
    end

    subgraph "Réseau interne Kubernetes"
        GW["NGINX Gateway Fabric<br/>ext_auth subrequests"]
        subgraph "Services"
            AUTH & ACCESS & SITE
            VEHICLE & CLIENT_VEH & WORKSHOP & TELEMETRY
        end
        subgraph "mTLS zone"
            MAP["Map Service"]
        end
        subgraph "Données"
            DB["Bases de données<br/>accès exclusif par service propriétaire"]
        end
    end

    CLIENT -->|"HTTPS"| GW
    GW -->|"subrequest auth"| AUTH
    GW -->|"subrequest access"| ACCESS
    GW -->|"route HTTP"| Services
    GW -->|"mTLS port 3443"| MAP
    WORKSHOP -->|"HTTP"| ACCESS
    WORKSHOP -->|"HTTP"| TELEMETRY
```

- **Isolation externe/interne** : seule la Gateway est exposée
- **Network policies Kubernetes** : chaque service ne contacte que ceux dont il a besoin
- **Egress bloqué** : aucun service ne peut contacter l'extérieur du cluster
- **DNS interne** : `*.dynaflow.svc.cluster.local`
- **mTLS** : uniquement pour le chemin NGF → Map Service (port 3443)

### Matrice de communication autorisée (network policies)

| Source → | Auth | Access | Site | Vehicle | Client Veh. | Map | Workshop | Telemetry |
|----------|------|--------|------|---------|-------------|-----|----------|-----------|
| **Gateway** | ✅ subreq | ✅ subreq | ✅ | ✅ | ✅ | ✅ mTLS | ✅ | ✅ |
| **Workshop** | — | ✅ HTTP | — | — | — | — | — | ✅ HTTP |
| **Autres** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

### Couche 2 : API Gateway (NGINX Gateway Fabric)

- **TLS termination** : HTTPS déchiffré par NGINX
- **Rate limiting** : configurable par rôle via NGINX policies (login: 5/min, API standard: 100/min)
- **CORS + headers** : CSP, X-Frame-Options, X-Content-Type-Options, HSTS (configurés dans NGINX)
- **ext_auth subrequests** : 2 subrequests avant routage (Auth → Access)
- **Configuration** : déclarative en YAML, déployée via ArgoCD (repo séparé)
- **Cache permissions** : géré par l'Access Service (pas par NGINX). **Pas de cache pour le Map Service** (vérification temps réel systématique)

### Couche 3 : Authentification (Auth Service)

```mermaid
sequenceDiagram
    participant U as Utilisateur
    participant A as Auth Service
    participant R as Redis

    U->>A: POST /login { email, password }
    A->>A: bcrypt.compare(password, hash) — coût 12
    A->>A: Générer access_token (JWT, 15min, contient user_id + account_type)
    A->>A: Générer refresh_token (7j)
    A->>A: Stocker refresh_token hashé en DB
    A-->>U: { access_token, refresh_token }

    Note over U,A: 15 minutes plus tard...

    U->>A: POST /refresh { refresh_token }
    A->>A: Vérifier refresh_token
    A->>A: Invalider ancien refresh_token
    A->>A: Émettre nouveau access + refresh
    A-->>U: { new_access_token, new_refresh_token }

    Note over U,A: Refresh token réutilisé (vol détecté)

    U->>A: POST /refresh { old_refresh_token }
    A->>A: Token déjà utilisé → VOL DÉTECTÉ
    A->>A: Révoquer TOUS les tokens de l'utilisateur
    A-->>U: 401 Unauthorized

    Note over U,A: Admin révoque un utilisateur

    A->>R: SET blacklist:{jti} EX {remaining_ttl}
    Note over R: JWT blacklisté jusqu'à expiration naturelle
```

- **Mots de passe** : bcrypt coût 12 (~250ms)
- **Access token** : JWT, 15 minutes, contient `user_id` et `account_type`
- **Refresh token** : 7 jours, hashé en DB, rotation à chaque usage
- **Détection de vol** : réutilisation d'un refresh token → révocation totale
- **Blacklist JWT** : Redis partagé entre Gateway et Auth, TTL auto = expiration du JWT
- **Login tracking** : `last_login`, `failed_attempts`, `locked_until`

### Couche 4 : Autorisation (Access Service)

```mermaid
graph TD
    REQ["Requête entrante"] --> JWT{"JWT valide ?"}
    JWT -->|Non| R401["401 Unauthorized"]
    JWT -->|Oui| EXTRACT["Extraire user_id"]
    
    EXTRACT --> PERM_CHECK{"Vérifier permissions"}
    
    PERM_CHECK --> ROLE["1. Permissions via rôle<br/>(user_roles → role_permissions)"]
    PERM_CHECK --> DIRECT["2. Permissions directes<br/>(user_permissions sur resource_id)"]
    PERM_CHECK --> TEMP["3. Permissions temporaires<br/>(temp_permissions, TTL non expiré)"]
    
    ROLE --> ALLOWED{"Au moins une<br/>source autorise ?"}
    DIRECT --> ALLOWED
    TEMP --> ALLOWED
    
    ALLOWED -->|Non| R403["403 Forbidden"]
    ALLOWED -->|Oui| SCOPE["Extraire scope (site_id ou global)"]
    SCOPE --> FORWARD["Transmettre au service métier<br/>avec user context + scope"]
```

#### 3 niveaux d'autorisation

| Type | Table | Portée | Durée | Exemple |
|------|-------|--------|-------|---------|
| **Rôle** | `user_roles` → `role_permissions` | Toutes ressources du type + scope site | Permanent | Technicien Lyon : `intervention:read` sur site Lyon |
| **Permission directe** | `user_permissions` | Une ressource spécifique | Permanent | Accès `map:read` sur map_xyz uniquement |
| **Permission temporaire** | `temp_permissions` | Une ressource spécifique | TTL (72h) | `map:download` sur map_xyz pendant l'intervention |

#### Convention des permissions : `ressource:action`

**Actions CRUD** : `create`, `read`, `update`, `delete`

**Actions spécifiques** :
- `map:download` — télécharger le fichier binaire
- `map:validate` — marquer une map comme validée
- `map:revoke` — révoquer une map
- `intervention:assign` — assigner un technicien
- `intervention:close` — clôturer une intervention

#### Rôles par défaut (5, modifiables par le super admin)

| Permission | super_admin | site_manager | cartographer | technician | client |
|------------|:-----------:|:------------:|:------------:|:----------:|:------:|
| user:* | ✅ | CRUD (son site) | — | — | — |
| role:* / permission:assign | ✅ | — | — | — | — |
| site:* | ✅ | read (son site) | — | — | — |
| vehicle_config:* | ✅ | read | read | read | — |
| client_vehicle:* | ✅ | CRUD (son site) | — | read (assignés) | read (ses véhicules) |
| map:CRUD | ✅ | read | CRUD | read | — |
| map:download | ✅ | — | ✅ (toutes) | ✅ (temp, assignée) | — |
| map:validate/revoke | ✅ | — | ✅ | — | — |
| intervention:* | ✅ | CRUD (son site) | read | RU (assignées) | read (ses) |
| intervention:assign/close | ✅ | ✅ (son site) | — | close (assignées) | — |
| telemetry:* | ✅ | read (son site) | read | CR (assignées) | read (ses) |
| monitoring:read | ✅ | — | — | — | — |

#### Scope : `site_id` ou `NULL` (global)

- `site_id = NULL` → le rôle s'applique à tous les sites
- `site_id = uuid` → le rôle est limité à ce site
- Le scope est résolu par l'Access Service qui interroge le Site Service

#### Permissions temporaires — flux complet

```mermaid
sequenceDiagram
    participant SM as Site Manager
    participant WS as Workshop
    participant AC as Access
    participant TE as Technicien
    participant GW as Gateway
    participant MAP as Map Service

    SM->>WS: Assigner intervention #42 à Jean (map: map_xyz)
    WS->>AC: POST /temp-permissions<br/>{ user: jean, permission_code: "map:download",<br/>resource: map_xyz, linked_to: interv_42, ttl: 72h }
    AC-->>WS: 201 Created

    Note over TE,MAP: Jean veut télécharger la map

    TE->>GW: GET /maps/map_xyz/download (JWT)
    GW->>AC: Check permission (temps réel, pas de cache pour Map)
    AC->>AC: Trouvé temp_permission, TTL valide
    AC-->>GW: { allowed: true }
    GW->>MAP: GET /maps/map_xyz/download (mTLS)
    MAP-->>GW: fichier binaire
    GW-->>TE: fichier binaire

    Note over WS,AC: Intervention clôturée

    WS->>AC: DELETE /temp-permissions/by-link/interv_42
    AC-->>WS: 200 OK (permissions supprimées)

    Note over AC: Filet de sécurité TTL
    AC->>AC: Job périodique : supprimer les temp_permissions<br/>où created_at + ttl < now()
```

### Couche 5 : Validation des entrées

- Chaque service valide ses propres entrées selon son JSON Schema (Ajv natif Fastify)
- Protection contre injections SQL, NoSQL, XSS
- Sanitization des inputs — rejet avant la logique métier

### Couche 6 : Audit et traçabilité

- Middleware `@dynolab/core` tague automatiquement les actions sensibles
- Logs JSON structurés (Pino) avec format uniforme
- Actions sensibles : accès map, modification permissions, download, login, changements de statut
- Pipeline : Services → Alloy (collecte) → Loki (agrégation) → Grafana (dashboard + alertes)

---

## 5. Modèle de données complet

### 5.1 Auth Service — PostgreSQL (port 5432)

```sql
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(255) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    first_name      VARCHAR(100) NOT NULL,
    last_name       VARCHAR(100) NOT NULL,
    account_type    VARCHAR(20) NOT NULL CHECK (account_type IN ('internal', 'client')),
    phone           VARCHAR(20),
    mfa_enabled     BOOLEAN DEFAULT false,
    is_active       BOOLEAN DEFAULT true,
    last_login      TIMESTAMPTZ,
    failed_attempts INTEGER DEFAULT 0,
    locked_until    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE refresh_tokens (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash      VARCHAR(255) NOT NULL,
    expires_at      TIMESTAMPTZ NOT NULL,
    is_revoked      BOOLEAN DEFAULT false,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_hash ON refresh_tokens(token_hash);
```

**Redis** : `blacklisted_tokens` — clé = `blacklist:{jti}`, TTL auto = expiration restante du JWT.

### 5.2 Access Service — PostgreSQL (port 5433)

```sql
CREATE TABLE roles (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(50) UNIQUE NOT NULL,
    description     VARCHAR(255),
    is_system       BOOLEAN DEFAULT false,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE permissions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    permission_code VARCHAR(100) UNIQUE NOT NULL,
    description     VARCHAR(255),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE role_permissions (
    role_id         UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id   UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE user_roles (
    user_id         UUID NOT NULL,
    role_id         UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    site_id         UUID,  -- NULL = global
    assigned_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    assigned_by     UUID NOT NULL,
    PRIMARY KEY (user_id, role_id, COALESCE(site_id, '00000000-0000-0000-0000-000000000000'))
);

CREATE TABLE user_permissions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL,
    permission_code VARCHAR(100) NOT NULL,
    resource_id     UUID NOT NULL,
    granted_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    granted_by      UUID NOT NULL
);

CREATE TABLE temp_permissions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL,
    permission_code VARCHAR(100) NOT NULL,
    resource_id     UUID NOT NULL,
    linked_to       UUID NOT NULL,
    ttl_seconds     INTEGER NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at      TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_temp_perm_user ON temp_permissions(user_id);
CREATE INDEX idx_temp_perm_expires ON temp_permissions(expires_at);
CREATE INDEX idx_temp_perm_linked ON temp_permissions(linked_to);
CREATE INDEX idx_user_perm_user ON user_permissions(user_id);
```

### 5.3 Site Service — PostgreSQL (port 5434)

```sql
CREATE TABLE sites (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(100) NOT NULL,
    address         VARCHAR(255),
    city            VARCHAR(100),
    country         VARCHAR(100),
    is_active       BOOLEAN DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE equipment (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id         UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    type            VARCHAR(50) NOT NULL CHECK (type IN ('dyno_bench', 'diag_tool', 'ecu_flasher', 'other')),
    brand           VARCHAR(100),
    model           VARCHAR(100),
    serial_number   VARCHAR(100),
    is_operational  BOOLEAN DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE site_members (
    user_id         UUID NOT NULL,
    site_id         UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    joined_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, site_id)
);
```

### 5.4 Vehicle Service — MongoDB (port 27017)

```javascript
// Collection: vehicles
{
  _id:            ObjectId,
  brand:          String,          // "Volkswagen"
  model:          String,          // "Golf 7 GTI"
  year_start:     Number,          // 2013
  year_end:       Number | null,   // 2020 or null
  engine_code:    String,          // "EA888 Gen3"
  fuel_type:      String,          // "gasoline", "diesel", "e85", "hybrid"
  ecu_type:       String,          // "Bosch MED17.5.2"
  stock_hp:       Number,          // 230
  stock_torque:   Number,          // 350
  specs:          Object,          // free-form, varies by vehicle
  tags:           [String],        // ["turbo", "direct_injection"]
  created_at:     Date,
  updated_at:     Date
}

// Index
db.vehicles.createIndex({ brand: 1, model: 1 });
db.vehicles.createIndex({ engine_code: 1 });
db.vehicles.createIndex({ ecu_type: 1 });
```

### 5.5 Client Vehicle Service — PostgreSQL (port 5435)

```sql
CREATE TABLE client_vehicles (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id        UUID NOT NULL,
    config_id       VARCHAR(24) NOT NULL,  -- MongoDB ObjectId as string
    vin             VARCHAR(17) UNIQUE NOT NULL,
    plate_number    VARCHAR(20),
    mileage         INTEGER,
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE vehicle_modifications (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id      UUID NOT NULL REFERENCES client_vehicles(id) ON DELETE CASCADE,
    category        VARCHAR(50) NOT NULL,
    description     VARCHAR(255) NOT NULL,
    installed_at    DATE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_client_vehicles_owner ON client_vehicles(owner_id);
CREATE INDEX idx_vehicle_mods_vehicle ON vehicle_modifications(vehicle_id);
```

### 5.6 Map Service — PostgreSQL (port 5436) + MinIO (port 9000)

```sql
CREATE TABLE maps (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(255) NOT NULL,
    config_id       VARCHAR(24) NOT NULL,
    type            VARCHAR(50) NOT NULL CHECK (type IN ('stage1', 'stage2', 'e85', 'custom')),
    status          VARCHAR(50) NOT NULL CHECK (status IN ('draft', 'in_development', 'validated', 'revoked')) DEFAULT 'draft',
    author_id       UUID NOT NULL,
    description     TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE map_versions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    map_id          UUID NOT NULL REFERENCES maps(id) ON DELETE CASCADE,
    version_number  VARCHAR(20) NOT NULL,
    changelog       TEXT,
    file_ref        VARCHAR(500) NOT NULL,  -- MinIO key: maps/{map_id}/{version}.bin
    file_hash       VARCHAR(64) NOT NULL,   -- SHA-256
    file_size       BIGINT NOT NULL,        -- bytes
    author_id       UUID NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (map_id, version_number)
);

CREATE TABLE map_config_compatibility (
    map_id          UUID NOT NULL REFERENCES maps(id) ON DELETE CASCADE,
    config_id       VARCHAR(24) NOT NULL,
    notes           VARCHAR(255),
    PRIMARY KEY (map_id, config_id)
);

CREATE INDEX idx_maps_config ON maps(config_id);
CREATE INDEX idx_maps_status ON maps(status);
CREATE INDEX idx_map_versions_map ON map_versions(map_id);
```

**MinIO** : bucket `dynolab-maps`, clé = `maps/{map_id}/{version_number}.bin`

### 5.7 Workshop Service — PostgreSQL (port 5437)

```sql
CREATE TABLE interventions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_vehicle_id   UUID NOT NULL,
    site_id             UUID NOT NULL,
    technician_id       UUID NOT NULL,
    map_id              UUID,
    map_version_id      UUID,
    type                VARCHAR(50) NOT NULL CHECK (type IN ('remap', 'diagnostics', 'bench_only', 'custom')),
    status              VARCHAR(50) NOT NULL CHECK (status IN ('pending', 'in_progress', 'completed', 'delivered')) DEFAULT 'pending',
    notes               TEXT,
    started_at          TIMESTAMPTZ,
    completed_at        TIMESTAMPTZ,
    delivered_at        TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE intervention_status_history (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    intervention_id     UUID NOT NULL REFERENCES interventions(id) ON DELETE CASCADE,
    from_status         VARCHAR(50),
    to_status           VARCHAR(50) NOT NULL,
    changed_by          UUID NOT NULL,
    reason              TEXT,
    changed_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_interventions_vehicle ON interventions(client_vehicle_id);
CREATE INDEX idx_interventions_site ON interventions(site_id);
CREATE INDEX idx_interventions_tech ON interventions(technician_id);
CREATE INDEX idx_interventions_status ON interventions(status);
CREATE INDEX idx_status_history_intervention ON intervention_status_history(intervention_id);
```

### 5.8 Telemetry Service — TimescaleDB (port 5438)

```sql
CREATE TABLE bench_sessions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    intervention_id     UUID NOT NULL,
    type                VARCHAR(10) NOT NULL CHECK (type IN ('before', 'after')),
    bench_id            UUID,
    peak_hp             DECIMAL,
    peak_torque         DECIMAL,
    notes               TEXT,
    started_at          TIMESTAMPTZ NOT NULL,
    ended_at            TIMESTAMPTZ
);

CREATE TABLE dyno_datapoints (
    session_id      UUID NOT NULL REFERENCES bench_sessions(id) ON DELETE CASCADE,
    timestamp       TIMESTAMPTZ NOT NULL,
    rpm             INTEGER,
    horsepower      DECIMAL,
    torque          DECIMAL,
    boost_pressure  DECIMAL,
    intake_temp     DECIMAL,
    exhaust_temp    DECIMAL,
    afr             DECIMAL,
    knock_count     INTEGER,
    oil_temp        DECIMAL,
    coolant_temp    DECIMAL
);

SELECT create_hypertable('dyno_datapoints', 'timestamp');

CREATE TABLE obd_logs (
    session_id      UUID NOT NULL REFERENCES bench_sessions(id) ON DELETE CASCADE,
    timestamp       TIMESTAMPTZ NOT NULL,
    pid             VARCHAR(10) NOT NULL,
    value           DECIMAL NOT NULL,
    unit            VARCHAR(20)
);

SELECT create_hypertable('obd_logs', 'timestamp');

CREATE INDEX idx_dyno_session ON dyno_datapoints(session_id, timestamp DESC);
CREATE INDEX idx_obd_session ON obd_logs(session_id, timestamp DESC);
```

---

## 6. Monorepo — Structure de fichiers

```
dynolab/
├── pnpm-workspace.yaml
├── package.json
├── tsconfig.base.json
├── eslint.config.mjs
├── .prettierrc
├── docker/
│   ├── docker-compose.yml
│   └── prometheus.yml
├── packages/
│   └── core/                          # @dynolab/core
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── index.ts               # re-exports everything
│           ├── logger.ts              # Pino structured logging
│           ├── audit.ts               # audit middleware, sensitive action tagging
│           ├── errors.ts              # standard HTTP error handling
│           ├── metrics.ts             # Prometheus metrics emission
│           ├── rabbitmq.ts            # RabbitMQ client (pub/sub)
│           └── config.ts              # env var loading
├── services/
│   ├── auth/                          # Auth Service :4001
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── Dockerfile
│   │   └── src/
│   │       ├── index.ts               # Fastify app bootstrap
│   │       ├── routes/                # endpoint definitions
│   │       ├── handlers/              # business logic
│   │       ├── models/                # DB models (Knex/Prisma)
│   │       ├── schemas/               # JSON Schema for validation
│   │       ├── plugins/               # Fastify plugins (db, redis)
│   │       └── tests/
│   ├── access/                        # Access Service :4002
│   ├── site/                          # Site Service :4003
│   ├── vehicle/                       # Vehicle Service :4004
│   ├── client-vehicle/                # Client Vehicle Service :4005
│   ├── map/                           # Map Service :4006
│   ├── workshop/                      # Workshop Service :4007
│   └── telemetry/                     # Telemetry Service :4008
├── schemas/                           # shared OpenAPI + JSON Schema
└── docker/
    └── docker-compose.yml             # dev local uniquement (bases de données + Redis + RabbitMQ + MinIO)
```

> **Note** : l'infrastructure Kubernetes (ArgoCD, NGINX Gateway Fabric config, network policies, cert-manager) est gérée dans le répertoire `argocd/` à la racine du dépôt.

### Structure type d'un service

```
services/{service-name}/
├── package.json
├── tsconfig.json
├── Dockerfile
└── src/
    ├── index.ts               # Fastify app creation + bootstrap
    ├── routes/
    │   └── {resource}.routes.ts
    ├── handlers/
    │   └── {resource}.handler.ts
    ├── models/
    │   └── {resource}.model.ts
    ├── schemas/
    │   └── {resource}.schema.ts   # JSON Schema for Fastify validation
    ├── plugins/
    │   ├── database.ts            # DB connection plugin
    │   └── ...
    └── tests/
        └── {resource}.test.ts
```

### Convention des imports

```typescript
// Depuis n'importe quel service :
import { createLogger, createAuditLogger, AppError, createMetrics } from '@dynolab/core';
```

---

## 7. Notes d'implémentation

### Identifiants

- Tous les IDs sont des **UUID v4** (`gen_random_uuid()` en PostgreSQL)
- Le Vehicle Service utilise des **ObjectId MongoDB** (référencés comme `VARCHAR(24)` dans les services PostgreSQL)

### Références inter-services

Les services ne stockent **jamais** les données d'un autre service — uniquement des IDs de référence. Ces IDs sont des clés étrangères logiques entre services ; les services ne font **pas** d'appels HTTP pour les résoudre (sauf Workshop → Access et Workshop → Telemetry qui sont des appels métier explicites, voir section 3.2).

| Service source | Champ | Service cible (logique) |
|----------------|-------|------------------------|
| Access | `user_roles.user_id` | Auth |
| Access | `user_roles.site_id` | Site |
| Client Vehicle | `client_vehicles.owner_id` | Auth |
| Client Vehicle | `client_vehicles.config_id` | Vehicle (ObjectId) |
| Map | `maps.config_id` | Vehicle (ObjectId) |
| Map | `maps.author_id` | Auth |
| Workshop | `interventions.client_vehicle_id` | Client Vehicle |
| Workshop | `interventions.site_id` | Site |
| Workshop | `interventions.technician_id` | Auth |
| Workshop | `interventions.map_id` | Map |
| Telemetry | `bench_sessions.intervention_id` | Workshop |
| Telemetry | `bench_sessions.bench_id` | Site (equipment) |

### Variables d'environnement (convention)

Chaque service attend ses propres variables :

```env
# Commun
PORT=4001
LOG_LEVEL=info
NODE_ENV=development

# Base de données (exemple Auth)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=dynolab_auth
DB_USER=dynolab
DB_PASSWORD=dynolab_dev

# Redis (Auth + Gateway)
REDIS_HOST=localhost
REDIS_PORT=6379

# RabbitMQ
RABBITMQ_URL=amqp://dynolab:dynolab_dev@localhost:5672

# JWT (Auth)
JWT_SECRET=dev-secret-change-in-production
JWT_ACCESS_TTL=900         # 15 minutes en secondes
JWT_REFRESH_TTL=604800     # 7 jours en secondes
```

---

## 8. Ordre de développement recommandé

1. **@dynolab/core** — logger, errors, config, metrics, rabbitmq, audit
2. **Auth Service** — users, login, JWT, refresh rotation, blacklist Redis, endpoint `/auth/verify` (pour le subrequest NGINX)
3. **Access Service** — roles, permissions, user_roles, temp_permissions, endpoint `/access/check` (pour le subrequest NGINX), cache interne
4. **NGINX Gateway Fabric config** — routes, ext_auth subrequests vers Auth + Access, TLS, rate limiting, CORS (dans le repo ArgoCD séparé)
5. **Site Service** — sites, equipment, site_members
6. **Vehicle Service** — MongoDB CRUD, schéma flexible
7. **Client Vehicle Service** — CRUD, lien vers Vehicle
8. **Map Service** — CRUD, versioning, MinIO upload/download, cycle de vie
9. **Workshop Service** — interventions, status history, temp_permissions lifecycle, événement RabbitMQ
10. **Telemetry Service** — bench_sessions, hypertables, données de courbes
