import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import { ensureExtension, ensureTable, ensureIndex } from '@dynolab/core';

export default fp(async (fastify: FastifyInstance) => {
    const { pg, log } = fastify;

    await ensureExtension(pg, log, 'pgcrypto');

    await ensureTable(pg, log, 'permissions', `
        CREATE TABLE IF NOT EXISTS permissions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            permission_code VARCHAR(255) NOT NULL UNIQUE,
            description TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);

    await ensureTable(pg, log, 'roles', `
        CREATE TABLE IF NOT EXISTS roles (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR(255) NOT NULL UNIQUE,
            description TEXT,
            is_system BOOLEAN NOT NULL DEFAULT FALSE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);

    await ensureTable(pg, log, 'role_permissions', `
        CREATE TABLE IF NOT EXISTS role_permissions (
            role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
            permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
            PRIMARY KEY (role_id, permission_id)
        )
    `);

    await ensureTable(pg, log, 'user_roles', `
        CREATE TABLE IF NOT EXISTS user_roles (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL,
            role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
            site_id UUID,
            assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            UNIQUE (user_id, role_id, site_id)
        )
    `);

    await ensureTable(pg, log, 'user_permissions', `
        CREATE TABLE IF NOT EXISTS user_permissions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL,
            permission_code VARCHAR(255) NOT NULL,
            resource_id UUID NOT NULL,
            site_id UUID,
            granted_by UUID,
            granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            UNIQUE (user_id, permission_code, resource_id)
        )
    `);

    await ensureTable(pg, log, 'temp_permissions', `
        CREATE TABLE IF NOT EXISTS temp_permissions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL,
            permission_code VARCHAR(255) NOT NULL,
            resource_id UUID NOT NULL,
            linked_to UUID NOT NULL,
            expires_at TIMESTAMPTZ NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);

    await ensureIndex(pg, log, 'idx_user_roles_user_id',
        `CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id)`);
    await ensureIndex(pg, log, 'idx_user_roles_role_id',
        `CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id)`);
    await ensureIndex(pg, log, 'idx_user_permissions_user_id',
        `CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON user_permissions(user_id)`);
    await ensureIndex(pg, log, 'idx_temp_permissions_user_id',
        `CREATE INDEX IF NOT EXISTS idx_temp_permissions_user_id ON temp_permissions(user_id)`);
    await ensureIndex(pg, log, 'idx_temp_permissions_linked_to',
        `CREATE INDEX IF NOT EXISTS idx_temp_permissions_linked_to ON temp_permissions(linked_to)`);
    await ensureIndex(pg, log, 'idx_temp_permissions_expires_at',
        `CREATE INDEX IF NOT EXISTS idx_temp_permissions_expires_at ON temp_permissions(expires_at)`);

    log.info('Access service schema ready');
});
