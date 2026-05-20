import { FastifyRequest, FastifyReply } from 'fastify';
import { FromSchema } from 'json-schema-to-ts';
import {
    GetRolesSchema,
    GetRoleByIdSchema,
    CreateRoleSchema,
    EditRoleSchema,
    DeleteRoleSchema,
    AssignPermissionsToRoleSchema,
    RemovePermissionsFromRoleSchema,
} from '../schemas/roles.schema';

type GetRolesQuery = FromSchema<typeof GetRolesSchema.querystring>;
type GetRoleByIdParams = FromSchema<typeof GetRoleByIdSchema.params>;
type CreateRoleBody = FromSchema<typeof CreateRoleSchema.body>;
type EditRoleParams = FromSchema<typeof EditRoleSchema.params>;
type EditRoleBody = FromSchema<typeof EditRoleSchema.body>;
type DeleteRoleParams = FromSchema<typeof DeleteRoleSchema.params>;
type AssignPermissionsParams = FromSchema<typeof AssignPermissionsToRoleSchema.params>;
type AssignPermissionsBody = FromSchema<typeof AssignPermissionsToRoleSchema.body>;
type RemovePermissionsParams = FromSchema<typeof RemovePermissionsFromRoleSchema.params>;
type RemovePermissionsBody = FromSchema<typeof RemovePermissionsFromRoleSchema.body>;

export async function getRolesHandler(
    request: FastifyRequest<{ Querystring: GetRolesQuery }>,
    reply: FastifyReply
) {
    try {
        const { page = 1, limit = 10 } = request.query;
        const offset = (page - 1) * limit;

        const countResult = await request.server.pg.query('SELECT COUNT(*) FROM roles');

        const result = await request.server.pg.query(
            `SELECT id, name, description, created_at, is_system
             FROM roles
             ORDER BY created_at DESC
             LIMIT $1 OFFSET $2`,
            [limit, offset]
        );

        const roles = result.rows.map((r: any) => ({
            id: r.id,
            name: r.name,
            description: r.description,
            createdAt: r.created_at,
            isSystem: r.is_system,
        }));

        return reply.code(200).send({
            roles,
            totalCount: parseInt(countResult.rows[0].count, 10),
            page,
            limit,
            message: 'Roles retrieved successfully',
        });
    } catch (error) {
        request.log.error(error, 'Error fetching roles');
        return reply.code(500).send({ message: 'Internal Server Error' });
    }
}

export async function getRoleByIdHandler(
    request: FastifyRequest<{ Params: GetRoleByIdParams }>,
    reply: FastifyReply
) {
    try {
        const { id } = request.params;

        const result = await request.server.pg.query(
            `SELECT id, name, description, created_at, is_system FROM roles WHERE id = $1`,
            [id]
        );

        if (result.rowCount === 0) {
            return reply.code(404).send({ message: 'Role not found' });
        }

        const row = result.rows[0];

        const perms = await request.server.pg.query(
            `SELECT p.id, p.permission_code, p.description
             FROM role_permissions rp
             JOIN permissions p ON rp.permission_id = p.id
             WHERE rp.role_id = $1`,
            [id]
        );

        const permissions = perms.rows.map((p: any) => ({
            id: p.id,
            permissionCode: p.permission_code,
            description: p.description,
        }));

        return reply.code(200).send({
            id: row.id,
            name: row.name,
            description: row.description,
            createdAt: row.created_at,
            isSystem: row.is_system,
            permissions,
            message: 'Role retrieved successfully',
        });
    } catch (error) {
        request.log.error(error, 'Error fetching role by id');
        return reply.code(500).send({ message: 'Internal Server Error' });
    }
}

export async function createRoleHandler(
    request: FastifyRequest<{ Body: CreateRoleBody }>,
    reply: FastifyReply
) {
    try {
        const { name, description } = request.body;
        const actorUserId = request.headers['x-user-id'] as string | undefined;

        const existing = await request.server.pg.query('SELECT id FROM roles WHERE name = $1', [name]);
        if ((existing.rowCount ?? 0) > 0) {
            return reply.code(409).send({ message: 'Role name already exists' });
        }

        const result = await request.server.pg.query(
            `INSERT INTO roles (name, description)
             VALUES ($1, $2)
             RETURNING id`,
            [name, description ?? null]
        );

        const roleId = result.rows[0].id;

        request.server.audit.log({
            action: 'role:create',
            resource: 'role',
            resourceId: roleId,
            userId: actorUserId,
        });

        return reply.code(201).send({ id: roleId, message: 'Role created successfully' });
    } catch (error) {
        request.log.error(error, 'Error creating role');
        return reply.code(500).send({ message: 'Internal Server Error' });
    }
}

export async function editRoleHandler(
    request: FastifyRequest<{ Params: EditRoleParams; Body: EditRoleBody }>,
    reply: FastifyReply
) {
    try {
        const { id } = request.params;
        const { name, description } = request.body;
        const actorUserId = request.headers['x-user-id'] as string | undefined;

        const setClauses: string[] = [];
        const params: unknown[] = [];

        if (name !== undefined) {
            // ensure name uniqueness
            const other = await request.server.pg.query('SELECT id FROM roles WHERE name = $1 AND id <> $2', [name, id]);
            if ((other.rowCount ?? 0) > 0) {
                return reply.code(409).send({ message: 'Role name already in use' });
            }
            params.push(name);
            setClauses.push(`name = $${params.length}`);
        }
        if (description !== undefined) {
            params.push(description);
            setClauses.push(`description = $${params.length}`);
        }

        if (setClauses.length === 0) {
            return reply.code(400).send({ message: 'No fields to update' });
        }

        params.push(id);
        const result = await request.server.pg.query(
            `UPDATE roles SET ${setClauses.join(', ')}, updated_at = NOW() WHERE id = $${params.length} RETURNING id, name, description`,
            params
        );

        if (result.rowCount === 0) {
            return reply.code(404).send({ message: 'Role not found' });
        }

        const row = result.rows[0];

        request.server.audit.log({
            action: 'role:update',
            resource: 'role',
            resourceId: id,
            userId: actorUserId,
        });

        return reply.code(200).send({ id: row.id, name: row.name, description: row.description, message: 'Role updated successfully' });
    } catch (error) {
        request.log.error(error, 'Error editing role');
        return reply.code(500).send({ message: 'Internal Server Error' });
    }
}

export async function deleteRoleHandler(
    request: FastifyRequest<{ Params: DeleteRoleParams }>,
    reply: FastifyReply
) {
    try {
        const { id } = request.params;
        const actorUserId = request.headers['x-user-id'] as string | undefined;

        const roleCheck = await request.server.pg.query('SELECT is_system FROM roles WHERE id = $1', [id]);
        if (roleCheck.rowCount === 0) {
            return reply.code(404).send({ message: 'Role not found' });
        }
        if (roleCheck.rows[0].is_system) {
            return reply.code(403).send({ message: 'Cannot delete a system role' });
        }

        const result = await request.server.pg.query('DELETE FROM roles WHERE id = $1 RETURNING id', [id]);
        if (result.rowCount === 0) {
            return reply.code(404).send({ message: 'Role not found' });
        }

        request.server.audit.log({
            action: 'role:delete',
            resource: 'role',
            resourceId: id,
            userId: actorUserId,
            sensitive: true,
        });

        return reply.code(200).send({ message: 'Role deleted successfully' });
    } catch (error) {
        request.log.error(error, 'Error deleting role');
        return reply.code(500).send({ message: 'Internal Server Error' });
    }
}

export async function assignPermissionsToRoleHandler(
    request: FastifyRequest<{ Params: AssignPermissionsParams; Body: AssignPermissionsBody }>,
    reply: FastifyReply
) {
    try {
        const { id } = request.params; // role id
        const { permissionIds } = request.body;
        const actorUserId = request.headers['x-user-id'] as string | undefined;

        const roleCheck = await request.server.pg.query('SELECT id FROM roles WHERE id = $1', [id]);
        if (roleCheck.rowCount === 0) {
            return reply.code(404).send({ message: 'Role not found' });
        }

        // Bulk insert ignoring duplicates
        await request.server.pg.query(
            `INSERT INTO role_permissions (role_id, permission_id)
             SELECT $1, unnest($2::uuid[])
             ON CONFLICT DO NOTHING`,
            [id, permissionIds]
        );

        request.server.audit.log({
            action: 'role:assign_permission',
            resource: 'role',
            resourceId: id,
            userId: actorUserId,
            metadata: { permissionIds },
        });

        return reply.code(200).send({ message: 'Permissions assigned to role' });
    } catch (error) {
        request.log.error(error, 'Error assigning permissions to role');
        return reply.code(500).send({ message: 'Internal Server Error' });
    }
}

export async function removePermissionsFromRoleHandler(
    request: FastifyRequest<{ Params: RemovePermissionsParams; Body: RemovePermissionsBody }>,
    reply: FastifyReply
) {
    try {
        const { id } = request.params; // role id
        const { permissionIds } = request.body;
        const actorUserId = request.headers['x-user-id'] as string | undefined;

        await request.server.pg.query(
            `DELETE FROM role_permissions
             WHERE role_id = $1 AND permission_id = ANY($2::uuid[])`,
            [id, permissionIds]
        );

        request.server.audit.log({
            action: 'role:remove_permission',
            resource: 'role',
            resourceId: id,
            userId: actorUserId,
            metadata: { permissionIds },
            sensitive: true,
        });

        return reply.code(200).send({ message: 'Permissions removed from role' });
    } catch (error) {
        request.log.error(error, 'Error removing permissions from role');
        return reply.code(500).send({ message: 'Internal Server Error' });
    }
}
