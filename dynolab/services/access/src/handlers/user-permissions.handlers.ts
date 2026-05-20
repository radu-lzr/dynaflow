import { FastifyRequest, FastifyReply } from 'fastify';
import { FromSchema } from 'json-schema-to-ts';
import {
    AssignPermissionsToUserSchema,
    GetUserPermissionsSchema,
    RemovePermissionFromUserSchema,
} from '../schemas/user-permissions.schema';

type AssignPermissionToUserBody = FromSchema<typeof AssignPermissionsToUserSchema.body>;
type GetUserPermissionsParams = FromSchema<typeof GetUserPermissionsSchema.params>;
type RemovePermissionFromUserParams = FromSchema<typeof RemovePermissionFromUserSchema.params>;

export async function assignPermissionToUserHandler(
    request: FastifyRequest<{ Body: AssignPermissionToUserBody }>,
    reply: FastifyReply
) {
    try {
        const { userId, permissionCode, resourceId, siteId } = request.body;

        const existingPermission = await request.server.pg.query(
            `SELECT id
             FROM user_permissions
             WHERE user_id = $1
               AND permission_code = $2
               AND resource_id = $3`,
            [userId, permissionCode, resourceId]
        );

        if ((existingPermission.rowCount ?? 0) > 0) {
            return reply.code(409).send({ message: 'Permission already assigned to this user for this resource' });
        }

        const grantedBy = request.headers['x-user-id'] as string | undefined;

        const result = await request.server.pg.query(
            `INSERT INTO user_permissions (user_id, permission_code, resource_id, site_id, granted_by)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id`,
            [userId, permissionCode, resourceId, siteId ?? null, grantedBy ?? null]
        );

        const permissionId = result.rows[0].id;

        request.server.audit.log({
            action: 'user_permission:assign',
            resource: 'user_permission',
            resourceId: permissionId,
            userId: grantedBy,
            metadata: { targetUserId: userId },
        });

        return reply.code(201).send({
            id: permissionId,
            message: 'Permission assigned to user successfully',
        });
    } catch (error) {
        request.log.error(error, 'Error assigning permission to user');
        return reply.code(500).send({ message: 'Internal Server Error' });
    }
}

export async function getUserPermissionsHandler(
    request: FastifyRequest<{ Params: GetUserPermissionsParams }>,
    reply: FastifyReply
) {
    try {
        const { userId } = request.params;

        const result = await request.server.pg.query(
            `SELECT id, permission_code, resource_id, granted_by, granted_at
             FROM user_permissions
             WHERE user_id = $1
             ORDER BY granted_at DESC`,
            [userId]
        );

        const permissions = result.rows.map((row: any) => ({
            id: row.id,
            permissionCode: row.permission_code,
            resourceId: row.resource_id,
            grantedBy: row.granted_by,
            grantedAt: row.granted_at,
        }));

        return reply.code(200).send({
            permissions,
            message: 'User permissions retrieved successfully',
        });
    } catch (error) {
        request.log.error(error, 'Error fetching user permissions');
        return reply.code(500).send({ message: 'Internal Server Error' });
    }
}

export async function removePermissionFromUserHandler(
    request: FastifyRequest<{ Params: RemovePermissionFromUserParams }>,
    reply: FastifyReply
) {
    try {
        const { id } = request.params;
        const actorUserId = request.headers['x-user-id'] as string | undefined;

        const result = await request.server.pg.query(
            `DELETE FROM user_permissions
             WHERE id = $1
             RETURNING id, user_id`,
            [id]
        );

        if (result.rowCount === 0) {
            return reply.code(404).send({ message: 'User permission not found' });
        }

        const removed = result.rows[0];

        request.server.audit.log({
            action: 'user_permission:remove',
            resource: 'user_permission',
            resourceId: removed.id,
            userId: actorUserId,
            metadata: { targetUserId: removed.user_id },
        });

        return reply.code(200).send({ message: 'Permission removed from user successfully' });
    } catch (error) {
        request.log.error(error, 'Error removing permission from user');
        return reply.code(500).send({ message: 'Internal Server Error' });
    }
}