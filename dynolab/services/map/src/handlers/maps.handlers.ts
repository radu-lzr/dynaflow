import { FastifyRequest, FastifyReply } from 'fastify';
import { FromSchema } from 'json-schema-to-ts';
import {
    GetMapsSchema,
    GetMapByIdSchema,
    CreateMapSchema,
    UpdateMapSchema,
    DeleteMapSchema,
    DevelopMapSchema,
    ValidateMapSchema,
    RevokeMapSchema,
    RedevelopMapSchema,
} from '../schemas/maps.schema';
import { DeleteObjectCommand } from '@aws-sdk/client-s3';

type GetMapsQuery = FromSchema<typeof GetMapsSchema.querystring>;
type GetMapByIdParams = FromSchema<typeof GetMapByIdSchema.params>;
type CreateMapBody = FromSchema<typeof CreateMapSchema.body>;
type UpdateMapParams = FromSchema<typeof UpdateMapSchema.params>;
type UpdateMapBody = FromSchema<typeof UpdateMapSchema.body>;
type DeleteMapParams = FromSchema<typeof DeleteMapSchema.params>;
type LifecycleParams = FromSchema<typeof DevelopMapSchema.params>;
type RevokeMapBody = FromSchema<typeof RevokeMapSchema.body>;

const VALID_TRANSITIONS: Record<string, string[]> = {
    draft: ['in_development'],
    in_development: ['validated', 'draft'],
    validated: ['revoked'],
    revoked: ['in_development'],
};

function canTransition(currentStatus: string, targetStatus: string): boolean {
    return VALID_TRANSITIONS[currentStatus]?.includes(targetStatus) ?? false;
}

export async function getMapsHandler(
    request: FastifyRequest<{ Querystring: GetMapsQuery }>,
    reply: FastifyReply
) {
    try {
        const { page = 1, limit = 20, search, configId, type, status, authorId } = request.query;
        const offset = (page - 1) * limit;

        const conditions: string[] = [];
        const params: unknown[] = [];

        if (search) {
            params.push(`%${search}%`);
            const i = params.length;
            conditions.push(`(name ILIKE $${i} OR description ILIKE $${i})`);
        }

        if (configId !== undefined) {
            params.push(configId);
            conditions.push(`config_id = $${params.length}`);
        }

        if (type !== undefined) {
            params.push(type);
            conditions.push(`type = $${params.length}`);
        }

        if (status !== undefined) {
            params.push(status);
            conditions.push(`status = $${params.length}`);
        }

        if (authorId !== undefined) {
            params.push(authorId);
            conditions.push(`author_id = $${params.length}`);
        }

        const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        const countResult = await request.server.pg.query(
            `SELECT COUNT(*) FROM maps ${where}`,
            params
        );

        const dataParams = [...params, limit, offset];
        const result = await request.server.pg.query(
            `SELECT id, name, config_id, type, status, author_id, description, created_at, updated_at
             FROM maps ${where}
             ORDER BY created_at DESC
             LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
            dataParams
        );

        const maps = result.rows.map((r: any) => ({
            id: r.id,
            name: r.name,
            configId: r.config_id,
            type: r.type,
            status: r.status,
            authorId: r.author_id,
            description: r.description,
            createdAt: r.created_at,
            updatedAt: r.updated_at,
        }));

        return reply.code(200).send({
            maps,
            totalCount: parseInt(countResult.rows[0].count, 10),
            page,
            limit,
            message: 'Maps retrieved successfully',
        });
    } catch (error) {
        request.log.error(error, 'Error fetching maps');
        return reply.code(500).send({ message: 'Internal Server Error' });
    }
}

export async function getMapByIdHandler(
    request: FastifyRequest<{ Params: GetMapByIdParams }>,
    reply: FastifyReply
) {
    try {
        const { id } = request.params;

        const mapResult = await request.server.pg.query(
            `SELECT id, name, config_id, type, status, author_id, description, created_at, updated_at
             FROM maps WHERE id = $1`,
            [id]
        );

        if (mapResult.rowCount === 0) {
            return reply.code(404).send({ message: 'Map not found' });
        }

        const row = mapResult.rows[0];

        const versionsResult = await request.server.pg.query(
            `SELECT id, version_number, changelog, file_size, file_hash, author_id, created_at
             FROM map_versions WHERE map_id = $1 ORDER BY created_at DESC`,
            [id]
        );

        const configsResult = await request.server.pg.query(
            `SELECT config_id, notes FROM map_config_compatibility WHERE map_id = $1`,
            [id]
        );

        const versions = versionsResult.rows.map((v: any) => ({
            id: v.id,
            versionNumber: v.version_number,
            changelog: v.changelog,
            fileSize: parseInt(v.file_size, 10),
            fileHash: v.file_hash,
            authorId: v.author_id,
            createdAt: v.created_at,
        }));

        const compatibleConfigs = configsResult.rows.map((c: any) => ({
            configId: c.config_id,
            notes: c.notes,
        }));

        return reply.code(200).send({
            id: row.id,
            name: row.name,
            configId: row.config_id,
            type: row.type,
            status: row.status,
            authorId: row.author_id,
            description: row.description,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            versions,
            compatibleConfigs,
            message: 'Map retrieved successfully',
        });
    } catch (error) {
        request.log.error(error, 'Error fetching map by id');
        return reply.code(500).send({ message: 'Internal Server Error' });
    }
}

export async function createMapHandler(
    request: FastifyRequest<{ Body: CreateMapBody }>,
    reply: FastifyReply
) {
    try {
        const { name, configId, type, description, authorId } = request.body;
        const actorUserId = request.headers['x-user-id'] as string | undefined;

        const result = await request.server.pg.query(
            `INSERT INTO maps (name, config_id, type, status, author_id, description)
             VALUES ($1, $2, $3, 'draft', $4, $5)
             RETURNING id`,
            [name, configId, type, authorId, description ?? null]
        );

        const mapId = result.rows[0].id;

        request.server.audit.log({
            action: 'map:create',
            resource: 'map',
            resourceId: mapId,
            userId: actorUserId,
            sensitive: true,
            metadata: { configId, type, authorId },
        });

        return reply.code(201).send({ id: mapId, message: 'Map created successfully' });
    } catch (error) {
        request.log.error(error, 'Error creating map');
        return reply.code(500).send({ message: 'Internal Server Error' });
    }
}

export async function updateMapHandler(
    request: FastifyRequest<{ Params: UpdateMapParams; Body: UpdateMapBody }>,
    reply: FastifyReply
) {
    try {
        const { id } = request.params;
        const { name, description, type } = request.body;
        const actorUserId = request.headers['x-user-id'] as string | undefined;

        const setClauses: string[] = [];
        const params: unknown[] = [];

        if (name !== undefined) {
            params.push(name);
            setClauses.push(`name = $${params.length}`);
        }

        if (description !== undefined) {
            params.push(description);
            setClauses.push(`description = $${params.length}`);
        }

        if (type !== undefined) {
            params.push(type);
            setClauses.push(`type = $${params.length}`);
        }

        if (setClauses.length === 0) {
            return reply.code(400).send({ message: 'No fields to update' });
        }

        params.push(id);
        const result = await request.server.pg.query(
            `UPDATE maps SET ${setClauses.join(', ')}, updated_at = NOW()
             WHERE id = $${params.length}
             RETURNING id`,
            params
        );

        if (result.rowCount === 0) {
            return reply.code(404).send({ message: 'Map not found' });
        }

        request.server.audit.log({
            action: 'map:update',
            resource: 'map',
            resourceId: id,
            userId: actorUserId,
            sensitive: true,
        });

        return reply.code(200).send({ id: result.rows[0].id, message: 'Map updated successfully' });
    } catch (error) {
        request.log.error(error, 'Error updating map');
        return reply.code(500).send({ message: 'Internal Server Error' });
    }
}

export async function deleteMapHandler(
    request: FastifyRequest<{ Params: DeleteMapParams }>,
    reply: FastifyReply
) {
    try {
        const { id } = request.params;
        const actorUserId = request.headers['x-user-id'] as string | undefined;

        const mapResult = await request.server.pg.query(
            `SELECT id FROM maps WHERE id = $1`,
            [id]
        );

        if (mapResult.rowCount === 0) {
            return reply.code(404).send({ message: 'Map not found' });
        }

        const versionsResult = await request.server.pg.query(
            `SELECT file_ref FROM map_versions WHERE map_id = $1`,
            [id]
        );

        const bucket = process.env.MINIO_BUCKET || 'dynolab-maps';

        for (const v of versionsResult.rows) {
            try {
                await request.server.minio.send(new DeleteObjectCommand({
                    Bucket: bucket,
                    Key: v.file_ref,
                }));
            } catch (minioErr) {
                request.log.warn({ fileRef: v.file_ref, err: minioErr }, 'Failed to delete file from MinIO');
            }
        }

        await request.server.pg.query(`DELETE FROM maps WHERE id = $1`, [id]);

        request.server.audit.log({
            action: 'map:delete',
            resource: 'map',
            resourceId: id,
            userId: actorUserId,
            sensitive: true,
            metadata: { versionCount: versionsResult.rowCount },
        });

        return reply.code(200).send({ message: 'Map deleted successfully' });
    } catch (error) {
        request.log.error(error, 'Error deleting map');
        return reply.code(500).send({ message: 'Internal Server Error' });
    }
}

async function transitionMap(
    request: FastifyRequest<{ Params: LifecycleParams }>,
    reply: FastifyReply,
    targetStatus: string,
    action: string,
    reason?: string
) {
    const { id } = request.params;
    const actorUserId = request.headers['x-user-id'] as string | undefined;

    const result = await request.server.pg.query(
        `SELECT id, status FROM maps WHERE id = $1`,
        [id]
    );

    if (result.rowCount === 0) {
        return reply.code(404).send({ message: 'Map not found' });
    }

    const currentStatus = result.rows[0].status;

    if (!canTransition(currentStatus, targetStatus)) {
        const allowed = VALID_TRANSITIONS[currentStatus] ?? [];
        return reply.code(400).send({
            message: `Cannot transition from '${currentStatus}' to '${targetStatus}'. Allowed transitions: ${allowed.join(', ')}`,
        });
    }

    const updateResult = await request.server.pg.query(
        `UPDATE maps SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING id, status`,
        [targetStatus, id]
    );

    request.server.audit.log({
        action,
        resource: 'map',
        resourceId: id,
        userId: actorUserId,
        sensitive: true,
        metadata: { fromStatus: currentStatus, toStatus: targetStatus, ...(reason ? { reason } : {}) },
    });

    return reply.code(200).send({
        id: updateResult.rows[0].id,
        status: updateResult.rows[0].status,
        message: `Map transitioned to '${targetStatus}' successfully`,
    });
}

export async function developMapHandler(
    request: FastifyRequest<{ Params: LifecycleParams }>,
    reply: FastifyReply
) {
    try {
        return await transitionMap(request, reply, 'in_development', 'map:develop');
    } catch (error) {
        request.log.error(error, 'Error transitioning map to in_development');
        return reply.code(500).send({ message: 'Internal Server Error' });
    }
}

export async function validateMapHandler(
    request: FastifyRequest<{ Params: LifecycleParams }>,
    reply: FastifyReply
) {
    try {
        return await transitionMap(request, reply, 'validated', 'map:validate');
    } catch (error) {
        request.log.error(error, 'Error transitioning map to validated');
        return reply.code(500).send({ message: 'Internal Server Error' });
    }
}

export async function revokeMapHandler(
    request: FastifyRequest<{ Params: LifecycleParams; Body: RevokeMapBody }>,
    reply: FastifyReply
) {
    try {
        const reason = request.body?.reason;
        return await transitionMap(request, reply, 'revoked', 'map:revoke', reason);
    } catch (error) {
        request.log.error(error, 'Error transitioning map to revoked');
        return reply.code(500).send({ message: 'Internal Server Error' });
    }
}

export async function redevelopMapHandler(
    request: FastifyRequest<{ Params: LifecycleParams }>,
    reply: FastifyReply
) {
    try {
        return await transitionMap(request, reply, 'in_development', 'map:develop');
    } catch (error) {
        request.log.error(error, 'Error re-transitioning map to in_development');
        return reply.code(500).send({ message: 'Internal Server Error' });
    }
}
