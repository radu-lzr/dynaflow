import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import { ensureTable, ensureIndex } from '@dynolab/core';

export default fp(async (fastify: FastifyInstance) => {
    const { pg, log } = fastify;

    await ensureTable(pg, log, 'client_vehicles', `
        CREATE TABLE IF NOT EXISTS client_vehicles (
            id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            owner_id        UUID NOT NULL,
            config_id       VARCHAR(24) NOT NULL,
            vin             VARCHAR(17) UNIQUE NOT NULL,
            plate_number    VARCHAR(20),
            mileage         INTEGER,
            notes           TEXT,
            created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    `);

    await ensureTable(pg, log, 'vehicle_modifications', `
        CREATE TABLE IF NOT EXISTS vehicle_modifications (
            id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            vehicle_id      UUID NOT NULL REFERENCES client_vehicles(id) ON DELETE CASCADE,
            category        VARCHAR(50) NOT NULL,
            description     VARCHAR(255) NOT NULL,
            installed_at    DATE,
            created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    `);

    await ensureIndex(pg, log, 'idx_client_vehicles_owner',
        `CREATE INDEX IF NOT EXISTS idx_client_vehicles_owner ON client_vehicles(owner_id)`);
    await ensureIndex(pg, log, 'idx_client_vehicles_config',
        `CREATE INDEX IF NOT EXISTS idx_client_vehicles_config ON client_vehicles(config_id)`);
    await ensureIndex(pg, log, 'idx_client_vehicles_vin',
        `CREATE INDEX IF NOT EXISTS idx_client_vehicles_vin ON client_vehicles(vin)`);
    await ensureIndex(pg, log, 'idx_vehicle_mods_vehicle',
        `CREATE INDEX IF NOT EXISTS idx_vehicle_mods_vehicle ON vehicle_modifications(vehicle_id)`);

    log.info('Client Vehicle service schema ready');
});
