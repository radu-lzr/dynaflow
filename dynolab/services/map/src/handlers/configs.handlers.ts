import { FastifyRequest, FastifyReply } from 'fastify';
import { FromSchema } from 'json-schema-to-ts';
import {
    GetConfigsSchema,
    AddConfigSchema,
    RemoveConfigSchema,
} from '../schemas/configs.schema';

type GetConfigsParams = FromSchema<typeof GetConfigsSchema.params>;
type AddConfigParams = FromSchema<typeof AddConfigSchema.params>;
type AddConfigBody = FromSchema<typeof AddConfigSchema.body>;
type RemoveConfigParams = FromSchema<typeof RemoveConfigSchema.params>;

export async function getConfigsHandler(
    request: FastifyRequest<{ Params: GetConfigsParams }>,
    reply: FastifyReply
) {
    try {
        const { id } = request.params;

        const mapResult = await request.server.pg.query(
            `SELECT id FROM maps WHERE id = $1`,
            [id]
        );

        if (mapResult.rowCount === 0) {
            return reply.code(404).send({ message: 'Map not found' });
        }

        const result = await request.server.pg.query(
            `SELECT config_id, notes FROM map_config_compatibility WHERE map_id = $1`,
            [id]
        );

        const configs = result.rows.map((c: any) => ({
            configId: c.config_id,
            notes: c.notes,
        }));

        return reply.code(200).send({ configs, message: 'Compatible configs retrieved successfully' });
    } catch (error) {
        request.log.error(error, 'Error fetching compatible configs');
        return reply.code(500).send({ message: 'Internal Server Error' });
    }
}

export async function addConfigHandler(
    request: FastifyRequest<{ Params: AddConfigParams; Body: AddConfigBody }>,
    reply: FastifyReply
) {
    try {
        const { id } = request.params;
        const { configId, notes } = request.body;
        const actorUserId = request.headers['x-user-id'] as string | undefined;

        const mapResult = await request.server.pg.query(
            `SELECT id FROM maps WHERE id = $1`,
            [id]
        );

        if (mapResult.rowCount === 0) {
            return reply.code(404).send({ message: 'Map not found' });
        }

        try {
            await request.server.pg.query(
                `INSERT INTO map_config_compatibility (map_id, config_id, notes) VALUES ($1, $2, $3)`,
                [id, configId, notes ?? null]
            );
        } catch (err: any) {
            if (err.code === '23505') {
                return reply.code(409).send({ message: 'Config already added to this map' });
            }
            throw err;
        }

        request.server.audit.log({
            action: 'map_config:add',
            resource: 'map',
            resourceId: id,
            userId: actorUserId,
            sensitive: true,
            metadata: { configId },
        });

        return reply.code(201).send({ message: 'Compatible config added successfully' });
    } catch (error) {
        request.log.error(error, 'Error adding compatible config');
        return reply.code(500).send({ message: 'Internal Server Error' });
    }
}

export async function removeConfigHandler(
    request: FastifyRequest<{ Params: RemoveConfigParams }>,
    reply: FastifyReply
) {
    try {
        const { id, configId } = request.params;
        const actorUserId = request.headers['x-user-id'] as string | undefined;

        const result = await request.server.pg.query(
            `DELETE FROM map_config_compatibility WHERE map_id = $1 AND config_id = $2 RETURNING map_id`,
            [id, configId]
        );

        if (result.rowCount === 0) {
            return reply.code(404).send({ message: 'Compatible config not found' });
        }

        request.server.audit.log({
            action: 'map_config:remove',
            resource: 'map',
            resourceId: id,
            userId: actorUserId,
            sensitive: true,
            metadata: { configId },
        });

        return reply.code(200).send({ message: 'Compatible config removed successfully' });
    } catch (error) {
        request.log.error(error, 'Error removing compatible config');
        return reply.code(500).send({ message: 'Internal Server Error' });
    }
}
