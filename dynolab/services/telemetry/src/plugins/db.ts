import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import { ensureExtension, ensureTable, ensureIndex } from '@dynolab/core';

export default fp(async (fastify: FastifyInstance) => {
    const { pg, log } = fastify;

    await ensureExtension(pg, log, 'timescaledb');

    await ensureTable(pg, log, 'bench_sessions', `
        CREATE TABLE IF NOT EXISTS bench_sessions (
            id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            intervention_id     UUID NOT NULL,
            type                VARCHAR(10) NOT NULL CHECK (type IN ('before', 'after')),
            bench_id            UUID,
            peak_hp             DECIMAL,
            peak_torque         DECIMAL,
            notes               TEXT,
            started_at          TIMESTAMPTZ NOT NULL,
            ended_at            TIMESTAMPTZ,
            created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    `);

    await ensureTable(pg, log, 'dyno_datapoints', `
        CREATE TABLE IF NOT EXISTS dyno_datapoints (
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
        )
    `);

    // Convert to hypertable (safe to call multiple times with if_not_exists)
    await pg.query(`SELECT create_hypertable('dyno_datapoints', 'timestamp', if_not_exists => TRUE)`);

    await ensureTable(pg, log, 'obd_logs', `
        CREATE TABLE IF NOT EXISTS obd_logs (
            session_id      UUID NOT NULL REFERENCES bench_sessions(id) ON DELETE CASCADE,
            timestamp       TIMESTAMPTZ NOT NULL,
            pid             VARCHAR(10) NOT NULL,
            value           DECIMAL NOT NULL,
            unit            VARCHAR(20)
        )
    `);

    await pg.query(`SELECT create_hypertable('obd_logs', 'timestamp', if_not_exists => TRUE)`);

    await ensureIndex(pg, log, 'idx_bench_sessions_intervention',
        `CREATE INDEX IF NOT EXISTS idx_bench_sessions_intervention ON bench_sessions(intervention_id)`);
    await ensureIndex(pg, log, 'idx_bench_sessions_type',
        `CREATE INDEX IF NOT EXISTS idx_bench_sessions_type ON bench_sessions(type)`);
    await ensureIndex(pg, log, 'idx_dyno_session',
        `CREATE INDEX IF NOT EXISTS idx_dyno_session ON dyno_datapoints(session_id, timestamp DESC)`);
    await ensureIndex(pg, log, 'idx_obd_session',
        `CREATE INDEX IF NOT EXISTS idx_obd_session ON obd_logs(session_id, timestamp DESC)`);
    await ensureIndex(pg, log, 'idx_obd_pid',
        `CREATE INDEX IF NOT EXISTS idx_obd_pid ON obd_logs(session_id, pid)`);

    log.info('Telemetry service schema ready');
});
