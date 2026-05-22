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
    file_ref        VARCHAR(500) NOT NULL,
    file_hash       VARCHAR(64) NOT NULL,
    file_size       BIGINT NOT NULL,
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
CREATE INDEX idx_maps_author ON maps(author_id);
CREATE INDEX idx_maps_type ON maps(type);
CREATE INDEX idx_map_versions_map ON map_versions(map_id);
