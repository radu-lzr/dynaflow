import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import { ensureTable, ensureIndex } from '@dynolab/core';

export default fp(async (fastify: FastifyInstance) => {
    const { pg, log } = fastify;

    await ensureTable(pg, log, 'interventions', `
        CREATE TABLE IF NOT EXISTS interventions (
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
        )
    `);

    await ensureTable(pg, log, 'intervention_status_history', `
        CREATE TABLE IF NOT EXISTS intervention_status_history (
            id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            intervention_id     UUID NOT NULL REFERENCES interventions(id) ON DELETE CASCADE,
            from_status         VARCHAR(50),
            to_status           VARCHAR(50) NOT NULL,
            changed_by          UUID NOT NULL,
            reason              TEXT,
            changed_at          TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    `);

    await ensureIndex(pg, log, 'idx_interventions_vehicle',
        `CREATE INDEX IF NOT EXISTS idx_interventions_vehicle ON interventions(client_vehicle_id)`);
    await ensureIndex(pg, log, 'idx_interventions_site',
        `CREATE INDEX IF NOT EXISTS idx_interventions_site ON interventions(site_id)`);
    await ensureIndex(pg, log, 'idx_interventions_tech',
        `CREATE INDEX IF NOT EXISTS idx_interventions_tech ON interventions(technician_id)`);
    await ensureIndex(pg, log, 'idx_interventions_status',
        `CREATE INDEX IF NOT EXISTS idx_interventions_status ON interventions(status)`);
    await ensureIndex(pg, log, 'idx_interventions_map',
        `CREATE INDEX IF NOT EXISTS idx_interventions_map ON interventions(map_id)`);
    await ensureIndex(pg, log, 'idx_status_history_intervention',
        `CREATE INDEX IF NOT EXISTS idx_status_history_intervention ON intervention_status_history(intervention_id)`);

    log.info('Workshop service schema ready');
});
