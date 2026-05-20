import type { Pool } from 'pg';
import type { FastifyBaseLogger } from 'fastify';

export async function ensureExtension(pg: Pool, log: FastifyBaseLogger, name: string) {
    const { rows } = await pg.query(
        `SELECT 1 FROM pg_extension WHERE extname = $1`,
        [name]
    );
    if (rows.length === 0) {
        await pg.query(`CREATE EXTENSION IF NOT EXISTS "${name}"`);
        log.info(`Created extension: ${name}`);
    }
}

export async function ensureTable(pg: Pool, log: FastifyBaseLogger, name: string, sql: string) {
    const { rows } = await pg.query(
        `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1`,
        [name]
    );
    if (rows.length === 0) {
        await pg.query(sql);
        log.info(`Created table: ${name}`);
    }
}

export async function ensureIndex(pg: Pool, log: FastifyBaseLogger, name: string, sql: string) {
    const { rows } = await pg.query(
        `SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = $1`,
        [name]
    );
    if (rows.length === 0) {
        await pg.query(sql);
        log.info(`Created index: ${name}`);
    }
}
