import { FastifyRequest, FastifyReply } from 'fastify';
import { FromSchema } from 'json-schema-to-ts';
import {
	CreateTempPermissionSchema,
	GetUserTempPermissionsSchema,
	RemoveTempPermissionByLinkedToSchema,
	RemoveTempPermissionByIdSchema,
} from '../schemas/temp-permissions.schema';

type CreateTempPermissionBody = FromSchema<typeof CreateTempPermissionSchema.body>;
type GetUserTempPermissionsParams = FromSchema<typeof GetUserTempPermissionsSchema.params>;
type RemoveTempPermissionByLinkedToParams = FromSchema<typeof RemoveTempPermissionByLinkedToSchema.params>;
type RemoveTempPermissionByIdParams = FromSchema<typeof RemoveTempPermissionByIdSchema.params>;

export async function createTempPermissionHandler(
	request: FastifyRequest<{ Body: CreateTempPermissionBody }>,
	reply: FastifyReply
) {
	try {
		const { userId, permissionCode, resourceId, linkedTo, ttlSeconds } = request.body;
		const actorUserId = request.headers['x-user-id'] as string | undefined;

		const result = await request.server.pg.query(
			`INSERT INTO temp_permissions (
				user_id,
				permission_code,
				resource_id,
				linked_to,
				expires_at
			)
			VALUES ($1, $2, $3, $4, NOW() + ($5 * INTERVAL '1 second'))
			RETURNING id, expires_at`,
			[userId, permissionCode, resourceId, linkedTo, ttlSeconds]
		);

		const tempPermission = result.rows[0];

		request.server.audit.log({
			action: 'temp_permission:create',
			resource: 'temp_permission',
			resourceId: tempPermission.id,
			userId: actorUserId,
			metadata: { targetUserId: userId, linkedTo },
		});

		return reply.code(201).send({
			id: tempPermission.id,
			expiresAt: tempPermission.expires_at,
			message: 'Temporary permission created successfully',
		});
	} catch (error) {
		request.log.error(error, 'Error creating temporary permission');
		return reply.code(500).send({ message: 'Internal Server Error' });
	}
}

export async function getUserTempPermissionsHandler(
	request: FastifyRequest<{ Params: GetUserTempPermissionsParams }>,
	reply: FastifyReply
) {
	try {
		const { userId } = request.params;

		const result = await request.server.pg.query(
			`SELECT id, permission_code, resource_id, linked_to, expires_at, created_at
			 FROM temp_permissions
			 WHERE user_id = $1
			   AND expires_at > NOW()
			 ORDER BY expires_at ASC`,
			[userId]
		);

		const permissions = result.rows.map((row: any) => ({
			id: row.id,
			permissionCode: row.permission_code,
			resourceId: row.resource_id,
			linkedTo: row.linked_to,
			expiresAt: row.expires_at,
			createdAt: row.created_at,
		}));

		return reply.code(200).send({
			permissions,
			message: 'Temporary permissions retrieved successfully',
		});
	} catch (error) {
		request.log.error(error, 'Error fetching temporary permissions');
		return reply.code(500).send({ message: 'Internal Server Error' });
	}
}

export async function removeTempPermissionByLinkedToHandler(
	request: FastifyRequest<{ Params: RemoveTempPermissionByLinkedToParams }>,
	reply: FastifyReply
) {
	try {
		const { linkedTo } = request.params;
		const actorUserId = request.headers['x-user-id'] as string | undefined;

		const result = await request.server.pg.query(
			`DELETE FROM temp_permissions
			 WHERE linked_to = $1
			 RETURNING id, user_id`,
			[linkedTo]
		);

		if (result.rowCount === 0) {
			return reply.code(404).send({ message: 'Temporary permissions not found' });
		}

		request.server.audit.log({
			action: 'temp_permission:delete',
			resource: 'temp_permission',
			resourceId: linkedTo,
			userId: actorUserId,
			sensitive: true,
			metadata: { targetUserId: result.rows[0].user_id, deletedCount: result.rowCount },
		});

		return reply.code(200).send({ message: 'Temporary permissions removed successfully' });
	} catch (error) {
		request.log.error(error, 'Error removing temporary permissions by linkedTo');
		return reply.code(500).send({ message: 'Internal Server Error' });
	}
}

export async function removeTempPermissionByIdHandler(
	request: FastifyRequest<{ Params: RemoveTempPermissionByIdParams }>,
	reply: FastifyReply
) {
	try {
		const { id } = request.params;
		const actorUserId = request.headers['x-user-id'] as string | undefined;

		const result = await request.server.pg.query(
			`DELETE FROM temp_permissions
			 WHERE id = $1
			 RETURNING id, user_id`,
			[id]
		);

		if (result.rowCount === 0) {
			return reply.code(404).send({ message: 'Temporary permission not found' });
		}

		const removed = result.rows[0];

		request.server.audit.log({
			action: 'temp_permission:delete',
			resource: 'temp_permission',
			resourceId: removed.id,
			userId: actorUserId,
			sensitive: true,
			metadata: { targetUserId: removed.user_id },
		});

		return reply.code(200).send({ message: 'Temporary permission removed successfully' });
	} catch (error) {
		request.log.error(error, 'Error removing temporary permission');
		return reply.code(500).send({ message: 'Internal Server Error' });
	}
}
