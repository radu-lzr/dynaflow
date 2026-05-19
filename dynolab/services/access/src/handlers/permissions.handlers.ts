import { FastifyRequest, FastifyReply } from 'fastify';
import { FromSchema } from "json-schema-to-ts";
import { CreatePermissionSchema, GetPermissionsSchema, DeletePermissionSchema } from "../schemas/permissions.schema";


type GetPermissionsQuery = FromSchema<typeof GetPermissionsSchema.querystring>;
type CreatePermissionBody = FromSchema<typeof CreatePermissionSchema.body>;
type DeletePermissionParams = FromSchema<typeof DeletePermissionSchema.params>;

export async function getPermissionsHandler(
    request: FastifyRequest<{ Querystring: GetPermissionsQuery }>, 
    reply: FastifyReply
) {
    try {
        const { page = 1, limit = 10, search } = request.query;
        const offset = (page - 1) * limit;

        const conditions: string[] = [];
        const params: unknown[] = [];

        if (search) {
            params.push(`%${search}%`);
            const i = params.length;
            conditions.push(`(permission_code ILIKE $${i} OR description ILIKE $${i})`);
        }

        const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        const countResult = await request.server.pg.query(
            `SELECT COUNT(*) FROM permissions ${where}`,
            params
        );

        const dataParams = [...params, limit, offset];
        const permsResult = await request.server.pg.query(
            `SELECT id, permission_code, description, created_at
             FROM permissions ${where}
             ORDER BY created_at DESC
             LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
            dataParams
        );

        const permissions = permsResult.rows.map((row: any) => ({
            id: row.id,
            permissionCode: row.permission_code,
            description: row.description,
            createdAt: row.created_at,
        }));

        return reply.code(200).send({
            permissions,
            totalCount: parseInt(countResult.rows[0].count, 10),
            page,
            limit,
            message: 'Permissions retrieved successfully'
        });

    } catch (error) {
        request.log.error(error, 'Error fetching permissions');
        reply.status(500).send({ error: 'Failed to fetch permissions' });
    }
};

export async function createPermissionHandler(
    request: FastifyRequest<{ Body: CreatePermissionBody }>,
    reply: FastifyReply
) {
    try {
        const { permissionCode, description } = request.body;

        const existingPermission = await request.server.pg.query(
            'SELECT id FROM permissions WHERE permission_code = $1',
            [permissionCode]
        );

        if ((existingPermission.rowCount ?? 0) > 0) {
            return reply.code(409).send({ message: 'Permission code already exists' });
        }

        const result = await request.server.pg.query(
            `INSERT INTO permissions (permission_code, description)
             VALUES ($1, $2)
             RETURNING id`,
            [permissionCode, description ?? null]
        );

        const permissionId = result.rows[0].id;

        request.server.audit.log({
            action: 'permission:create',
            resource: 'permission',
            resourceId: permissionId,
            userId: request.headers['x-user-id'] as string,
        });

        return reply.code(201).send({
            id: permissionId,
            message: 'Permission created successfully'
        });
    } catch (error) {
        request.log.error(error, 'Error creating permission');
        return reply.code(500).send({ message: 'Internal Server Error' });
    }
}

export async function deletePermissionHandler(
    request: FastifyRequest<{ Params: DeletePermissionParams }>,
    reply: FastifyReply
) {
    try {
        const { id } = request.params;

        const roleUsageResult = await request.server.pg.query(
            'SELECT COUNT(*) FROM role_permissions WHERE permission_id = $1',
            [id]
        );

        if (Number(roleUsageResult.rows[0].count) > 0) {
            return reply.code(409).send({
                message: 'Permission is assigned to roles, remove it from roles first'
            });
        }

        const result = await request.server.pg.query(
            'DELETE FROM permissions WHERE id = $1 RETURNING id',
            [id]
        );

        if (result.rowCount === 0) {
            return reply.code(404).send({ message: 'Permission not found' });
        }

        request.server.audit.log({
            action: 'permission:delete',
            resource: 'permission',
            resourceId: id,
            userId: request.headers['x-user-id'] as string,
            sensitive: true,
        });

        return reply.code(200).send({ message: 'Permission deleted successfully' });
    } catch (error) {
        request.log.error(error, 'Error deleting permission');
        return reply.code(500).send({ message: 'Internal Server Error' });
    }
}