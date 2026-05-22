import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import { ensureTable, ensureIndex } from '@dynolab/core';

export default fp(async (fastify: FastifyInstance) => {
    const { pg, log } = fastify;

    await ensureTable(pg, log, 'maps', `
        CREATE TABLE IF NOT EXISTS maps (
            id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name            VARCHAR(255) NOT NULL,
            config_id       VARCHAR(24) NOT NULL,
            type            VARCHAR(50) NOT NULL CHECK (type IN ('stage1', 'stage2', 'e85', 'custom')),
            status          VARCHAR(50) NOT NULL CHECK (status IN ('draft', 'in_development', 'validated', 'revoked')) DEFAULT 'draft',
            author_id       UUID NOT NULL,
            description     TEXT,
            created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    `);

    await ensureTable(pg, log, 'map_versions', `
        CREATE TABLE IF NOT EXISTS map_versions (
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
        )
    `);

    await ensureTable(pg, log, 'map_config_compatibility', `
        CREATE TABLE IF NOT EXISTS map_config_compatibility (
            map_id          UUID NOT NULL REFERENCES maps(id) ON DELETE CASCADE,
            config_id       VARCHAR(24) NOT NULL,
            notes           VARCHAR(255),
            PRIMARY KEY (map_id, config_id)
        )
    `);

    await ensureIndex(pg, log, 'idx_maps_config',
        `CREATE INDEX IF NOT EXISTS idx_maps_config ON maps(config_id)`);
    await ensureIndex(pg, log, 'idx_maps_status',
        `CREATE INDEX IF NOT EXISTS idx_maps_status ON maps(status)`);
    await ensureIndex(pg, log, 'idx_maps_author',
        `CREATE INDEX IF NOT EXISTS idx_maps_author ON maps(author_id)`);
    await ensureIndex(pg, log, 'idx_maps_type',
        `CREATE INDEX IF NOT EXISTS idx_maps_type ON maps(type)`);
    await ensureIndex(pg, log, 'idx_map_versions_map',
        `CREATE INDEX IF NOT EXISTS idx_map_versions_map ON map_versions(map_id)`);

    log.info('Map service schema ready');
});
