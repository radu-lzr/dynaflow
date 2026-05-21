import { FastifyRequest, FastifyReply } from 'fastify';
import { FromSchema } from 'json-schema-to-ts';
import {
    GetModificationsSchema,
    CreateModificationSchema,
    UpdateModificationSchema,
    DeleteModificationSchema,
} from '../schemas/modifications.schema';

type GetModificationsParams = FromSchema<typeof GetModificationsSchema.params>;
type CreateModificationParams = FromSchema<typeof CreateModificationSchema.params>;
type CreateModificationBody = FromSchema<typeof CreateModificationSchema.body>;
type UpdateModificationParams = FromSchema<typeof UpdateModificationSchema.params>;
type UpdateModificationBody = FromSchema<typeof UpdateModificationSchema.body>;
type DeleteModificationParams = FromSchema<typeof DeleteModificationSchema.params>;

export async function getModificationsHandler(
    request: FastifyRequest<{ Params: GetModificationsParams }>,
    reply: FastifyReply
) {
    try {
        const { vehicleId } = request.params;

        const vehicleCheck = await request.server.pg.query(
            'SELECT id FROM client_vehicles WHERE id = $1',
            [vehicleId]
        );
        if (vehicleCheck.rowCount === 0) {
            return reply.code(404).send({ message: 'Client vehicle not found' });
        }

        const result = await request.server.pg.query(
            `SELECT id, vehicle_id, category, description, installed_at, created_at
             FROM vehicle_modifications WHERE vehicle_id = $1 ORDER BY created_at DESC`,
            [vehicleId]
        );

        const modifications = result.rows.map((r: any) => ({
            id: r.id,
            vehicleId: r.vehicle_id,
            category: r.category,
            description: r.description,
            installedAt: r.installed_at,
            createdAt: r.created_at,
        }));

        return reply.code(200).send({
            modifications,
            message: 'Modifications retrieved successfully',
        });
    } catch (error) {
        request.log.error(error, 'Error fetching modifications');
        return reply.code(500).send({ message: 'Internal Server Error' });
    }
}

export async function createModificationHandler(
    request: FastifyRequest<{ Params: CreateModificationParams; Body: CreateModificationBody }>,
    reply: FastifyReply
) {
    try {
        const { vehicleId } = request.params;
        const { category, description, installedAt } = request.body;
        const actorUserId = request.headers['x-user-id'] as string | undefined;

        const vehicleCheck = await request.server.pg.query(
            'SELECT id FROM client_vehicles WHERE id = $1',
            [vehicleId]
        );
        if (vehicleCheck.rowCount === 0) {
            return reply.code(404).send({ message: 'Client vehicle not found' });
        }

        const result = await request.server.pg.query(
            `INSERT INTO vehicle_modifications (vehicle_id, category, description, installed_at)
             VALUES ($1, $2, $3, $4)
             RETURNING id`,
            [vehicleId, category, description, installedAt ?? null]
        );

        const modificationId = result.rows[0].id;

        request.server.audit.log({
            action: 'vehicle_modification:create',
            resource: 'vehicle_modification',
            resourceId: modificationId,
            userId: actorUserId,
            metadata: { vehicleId },
        });

        return reply.code(201).send({ id: modificationId, message: 'Modification added successfully' });
    } catch (error) {
        request.log.error(error, 'Error creating modification');
        return reply.code(500).send({ message: 'Internal Server Error' });
    }
}

export async function updateModificationHandler(
    request: FastifyRequest<{ Params: UpdateModificationParams; Body: UpdateModificationBody }>,
    reply: FastifyReply
) {
    try {
        const { vehicleId, id } = request.params;
        const { category, description, installedAt } = request.body;
        const actorUserId = request.headers['x-user-id'] as string | undefined;

        const setClauses: string[] = [];
        const params: unknown[] = [];

        if (category !== undefined) {
            params.push(category);
            setClauses.push(`category = $${params.length}`);
        }
        if (description !== undefined) {
            params.push(description);
            setClauses.push(`description = $${params.length}`);
        }
        if (installedAt !== undefined) {
            params.push(installedAt);
            setClauses.push(`installed_at = $${params.length}`);
        }

        if (setClauses.length === 0) {
            return reply.code(400).send({ message: 'No fields to update' });
        }

        params.push(id);
        params.push(vehicleId);
        const result = await request.server.pg.query(
            `UPDATE vehicle_modifications SET ${setClauses.join(', ')}
             WHERE id = $${params.length - 1} AND vehicle_id = $${params.length}
             RETURNING id`,
            params
        );

        if (result.rowCount === 0) {
            return reply.code(404).send({ message: 'Modification not found' });
        }

        request.server.audit.log({
            action: 'vehicle_modification:update',
            resource: 'vehicle_modification',
            resourceId: id,
            userId: actorUserId,
            metadata: { vehicleId },
        });

        return reply.code(200).send({ id: result.rows[0].id, message: 'Modification updated successfully' });
    } catch (error) {
        request.log.error(error, 'Error updating modification');
        return reply.code(500).send({ message: 'Internal Server Error' });
    }
}

export async function deleteModificationHandler(
    request: FastifyRequest<{ Params: DeleteModificationParams }>,
    reply: FastifyReply
) {
    try {
        const { vehicleId, id } = request.params;
        const actorUserId = request.headers['x-user-id'] as string | undefined;

        const result = await request.server.pg.query(
            `DELETE FROM vehicle_modifications WHERE id = $1 AND vehicle_id = $2 RETURNING id`,
            [id, vehicleId]
        );

        if (result.rowCount === 0) {
            return reply.code(404).send({ message: 'Modification not found' });
        }

        request.server.audit.log({
            action: 'vehicle_modification:delete',
            resource: 'vehicle_modification',
            resourceId: id,
            userId: actorUserId,
            metadata: { vehicleId },
        });

        return reply.code(200).send({ message: 'Modification deleted successfully' });
    } catch (error) {
        request.log.error(error, 'Error deleting modification');
        return reply.code(500).send({ message: 'Internal Server Error' });
    }
}
