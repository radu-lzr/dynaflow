import { FastifyRequest, FastifyReply } from 'fastify';
import { FromSchema } from 'json-schema-to-ts';
import {
    AssignRolesToUserSchema,
    GetUserRolesSchema,
    RemoveRoleFromUserSchema,
} from '../schemas/user-roles.schema';

type AssignRoleToUserBody = FromSchema<typeof AssignRolesToUserSchema.body>;
type GetUserRolesParams = FromSchema<typeof GetUserRolesSchema.params>;
type GetUserRolesQuery = FromSchema<typeof GetUserRolesSchema.querystring>;
type RemoveRoleFromUserBody = FromSchema<typeof RemoveRoleFromUserSchema.body>;

export async function assignRoleToUserHandler(
    request: FastifyRequest<{ Body: AssignRoleToUserBody }>,
    reply: FastifyReply
) {
    try {
        const { userId, roleId, siteId } = request.body;
        const actorUserId = request.headers['x-user-id'] as string | undefined;

        const roleResult = await request.server.pg.query(
            'SELECT id FROM roles WHERE id = $1',
            [roleId]
        );

        if (roleResult.rowCount === 0) {
            return reply.code(404).send({ message: 'Role not found' });
        }

        const exists = await request.server.pg.query(
            `SELECT id FROM user_roles
             WHERE user_id = $1 AND role_id = $2 AND site_id IS NOT DISTINCT FROM $3`,
            [userId, roleId, siteId ?? null]
        );

        if ((exists.rowCount ?? 0) > 0) {
            return reply.code(409).send({ message: 'Role already assigned to user for this site' });
        }

        await request.server.pg.query(
            `INSERT INTO user_roles (user_id, role_id, site_id)
             VALUES ($1, $2, $3)`,
            [userId, roleId, siteId ?? null]
        );

        request.server.audit.log({
            action: 'user_role:assign',
            resource: 'user_role',
            resourceId: roleId,
            userId: actorUserId,
            metadata: { targetUserId: userId, siteId: siteId ?? null },
        });

        return reply.code(201).send({ message: 'Role assigned to user' });
    } catch (error) {
        request.log.error(error, 'Error assigning role to user');
        return reply.code(500).send({ message: 'Internal Server Error' });
    }
}

export async function getUserRolesHandler(
    request: FastifyRequest<{ Params: GetUserRolesParams; Querystring: GetUserRolesQuery }>,
    reply: FastifyReply
) {
    try {
        const { userId } = request.params;
        const { siteId } = request.query || {};

        let query = `SELECT ur.role_id, r.name AS role_name, ur.site_id, ur.assigned_at
                     FROM user_roles ur
                     JOIN roles r ON ur.role_id = r.id
                     WHERE ur.user_id = $1`;
        const params: unknown[] = [userId];

        if (siteId !== undefined) {
            params.push(siteId ?? null);
            query += ` AND ur.site_id IS NOT DISTINCT FROM $${params.length}`;
        }

        query += ` ORDER BY ur.assigned_at DESC`;

        const result = await request.server.pg.query(query, params);

        const roles = result.rows.map((row: any) => ({
            roleId: row.role_id,
            roleName: row.role_name,
            siteId: row.site_id,
            assignedAt: row.assigned_at,
        }));

        return reply.code(200).send({ roles, message: 'User roles retrieved successfully' });
    } catch (error) {
        request.log.error(error, 'Error fetching user roles');
        return reply.code(500).send({ message: 'Internal Server Error' });
    }
}

export async function removeRoleFromUserHandler(
    request: FastifyRequest<{ Body: RemoveRoleFromUserBody }>,
    reply: FastifyReply
) {
    try {
        const { userId, roleId, siteId } = request.body;
        const actorUserId = request.headers['x-user-id'] as string | undefined;

        const result = await request.server.pg.query(
            `DELETE FROM user_roles
             WHERE user_id = $1 AND role_id = $2 AND site_id IS NOT DISTINCT FROM $3
             RETURNING id, user_id`,
            [userId, roleId, siteId ?? null]
        );

        if (result.rowCount === 0) {
            return reply.code(404).send({ message: 'Role assignment not found' });
        }

        request.server.audit.log({
            action: 'user_role:remove',
            resource: 'user_role',
            resourceId: roleId,
            userId: actorUserId,
            metadata: { targetUserId: userId, siteId: siteId ?? null },
            sensitive: true,
        });

        return reply.code(200).send({ message: 'Role removed from user successfully' });
    } catch (error) {
        request.log.error(error, 'Error removing role from user');
        return reply.code(500).send({ message: 'Internal Server Error' });
    }
}
