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

CREATE INDEX idx_equipment_site ON equipment(site_id);
CREATE INDEX idx_site_members_site ON site_members(site_id);
CREATE INDEX idx_site_members_user ON site_members(user_id);
