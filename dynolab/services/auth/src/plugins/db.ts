import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import { ensureTable, ensureIndex } from '@dynolab/core';
import { hashPassword } from '../utils/password';

const SEED_ADMIN_ID    = process.env.SEED_ADMIN_ID    ?? '11111111-1111-4111-8111-111111111111';
const SEED_ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? 'admin@dynolab.dev';

export default fp(async (fastify: FastifyInstance) => {
    const { pg, log } = fastify;

    await ensureTable(pg, log, 'users', `
        CREATE TABLE IF NOT EXISTS users (
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
        )
    `);

    await ensureTable(pg, log, 'refresh_tokens', `
        CREATE TABLE IF NOT EXISTS refresh_tokens (
            id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            token_hash  VARCHAR(255) NOT NULL,
            expires_at  TIMESTAMPTZ NOT NULL,
            revoked_at  TIMESTAMPTZ,
            created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    `);

    await ensureIndex(pg, log, 'idx_refresh_tokens_user',
        `CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id)`);
    await ensureIndex(pg, log, 'idx_refresh_tokens_hash',
        `CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON refresh_tokens(token_hash)`);

    const adminPassword = process.env.SEED_ADMIN_PASSWORD;
    if (!adminPassword) {
        log.warn('SEED_ADMIN_PASSWORD not set — skipping admin user seed');
    } else {
        const hash = await hashPassword(adminPassword);
        const { rowCount } = await pg.query(
            `INSERT INTO users (id, email, password_hash, first_name, last_name, account_type)
             VALUES ($1, $2, $3, 'Admin', 'DynoLab', 'internal')
             ON CONFLICT (email) DO NOTHING`,
            [SEED_ADMIN_ID, SEED_ADMIN_EMAIL, hash],
        );
        if ((rowCount ?? 0) > 0) {
            log.info({ email: SEED_ADMIN_EMAIL }, 'Seeded admin user');
        }
    }

    log.info('Auth service schema ready');
});
