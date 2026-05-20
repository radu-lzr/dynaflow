import { FastifyRequest, FastifyReply } from 'fastify';
import { FromSchema } from 'json-schema-to-ts';
import {
    GetEquipmentSchema,
    CreateEquipmentSchema,
    UpdateEquipmentSchema,
    DeleteEquipmentSchema,
} from '../schemas/equipment.schema';

type GetEquipmentParams = FromSchema<typeof GetEquipmentSchema.params>;
type GetEquipmentQuery = FromSchema<typeof GetEquipmentSchema.querystring>;
type CreateEquipmentParams = FromSchema<typeof CreateEquipmentSchema.params>;
type CreateEquipmentBody = FromSchema<typeof CreateEquipmentSchema.body>;
type UpdateEquipmentParams = FromSchema<typeof UpdateEquipmentSchema.params>;
type UpdateEquipmentBody = FromSchema<typeof UpdateEquipmentSchema.body>;
type DeleteEquipmentParams = FromSchema<typeof DeleteEquipmentSchema.params>;

export async function getEquipmentHandler(
    request: FastifyRequest<{ Params: GetEquipmentParams; Querystring: GetEquipmentQuery }>,
    reply: FastifyReply
) {
    try {
        const { siteId } = request.params;
        const { type, isOperational } = request.query;

        const siteCheck = await request.server.pg.query('SELECT id FROM sites WHERE id = $1', [siteId]);
        if (siteCheck.rowCount === 0) {
            return reply.code(404).send({ message: 'Site not found' });
        }

        const conditions: string[] = ['site_id = $1'];
        const params: unknown[] = [siteId];

        if (type !== undefined) {
            params.push(type);
            conditions.push(`type = $${params.length}`);
        }
        if (isOperational !== undefined) {
            params.push(isOperational);
            conditions.push(`is_operational = $${params.length}`);
        }

        const where = `WHERE ${conditions.join(' AND ')}`;

        const countResult = await request.server.pg.query(
            `SELECT COUNT(*) FROM equipment ${where}`,
            params
        );

        const result = await request.server.pg.query(
            `SELECT id, site_id, type, brand, model, serial_number, is_operational, created_at
             FROM equipment ${where}
             ORDER BY created_at DESC`,
            params
        );

        const items = result.rows.map((r: any) => ({
            id: r.id,
            siteId: r.site_id,
            type: r.type,
            brand: r.brand,
            model: r.model,
            serialNumber: r.serial_number,
            isOperational: r.is_operational,
            createdAt: r.created_at,
        }));

        return reply.code(200).send({
            items,
            totalCount: parseInt(countResult.rows[0].count, 10),
            message: 'Equipment retrieved successfully',
        });
    } catch (error) {
        request.log.error(error, 'Error fetching equipment');
        return reply.code(500).send({ message: 'Internal Server Error' });
    }
}

export async function createEquipmentHandler(
    request: FastifyRequest<{ Params: CreateEquipmentParams; Body: CreateEquipmentBody }>,
    reply: FastifyReply
) {
    try {
        const { siteId } = request.params;
        const { type, brand, model, serialNumber } = request.body;
        const actorUserId = request.headers['x-user-id'] as string | undefined;

        const siteCheck = await request.server.pg.query('SELECT id FROM sites WHERE id = $1', [siteId]);
        if (siteCheck.rowCount === 0) {
            return reply.code(404).send({ message: 'Site not found' });
        }

        const result = await request.server.pg.query(
            `INSERT INTO equipment (site_id, type, brand, model, serial_number)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id`,
            [siteId, type, brand ?? null, model ?? null, serialNumber ?? null]
        );

        const equipmentId = result.rows[0].id;

        request.server.audit.log({
            action: 'equipment:create',
            resource: 'equipment',
            resourceId: equipmentId,
            userId: actorUserId,
            metadata: { siteId },
        });

        return reply.code(201).send({ id: equipmentId, message: 'Equipment added successfully' });
    } catch (error) {
        request.log.error(error, 'Error creating equipment');
        return reply.code(500).send({ message: 'Internal Server Error' });
    }
}

export async function updateEquipmentHandler(
    request: FastifyRequest<{ Params: UpdateEquipmentParams; Body: UpdateEquipmentBody }>,
    reply: FastifyReply
) {
    try {
        const { siteId, id } = request.params;
        const { type, brand, model, serialNumber, isOperational } = request.body;
        const actorUserId = request.headers['x-user-id'] as string | undefined;

        const setClauses: string[] = [];
        const params: unknown[] = [];

        if (type !== undefined) {
            params.push(type);
            setClauses.push(`type = $${params.length}`);
        }
        if (brand !== undefined) {
            params.push(brand);
            setClauses.push(`brand = $${params.length}`);
        }
        if (model !== undefined) {
            params.push(model);
            setClauses.push(`model = $${params.length}`);
        }
        if (serialNumber !== undefined) {
            params.push(serialNumber);
            setClauses.push(`serial_number = $${params.length}`);
        }
        if (isOperational !== undefined) {
            params.push(isOperational);
            setClauses.push(`is_operational = $${params.length}`);
        }

        if (setClauses.length === 0) {
            return reply.code(400).send({ message: 'No fields to update' });
        }

        params.push(id);
        params.push(siteId);
        const result = await request.server.pg.query(
            `UPDATE equipment SET ${setClauses.join(', ')}
             WHERE id = $${params.length - 1} AND site_id = $${params.length}
             RETURNING id`,
            params
        );

        if (result.rowCount === 0) {
            return reply.code(404).send({ message: 'Equipment not found' });
        }

        request.server.audit.log({
            action: 'equipment:update',
            resource: 'equipment',
            resourceId: id,
            userId: actorUserId,
            metadata: { siteId },
        });

        return reply.code(200).send({ id: result.rows[0].id, message: 'Equipment updated successfully' });
    } catch (error) {
        request.log.error(error, 'Error updating equipment');
        return reply.code(500).send({ message: 'Internal Server Error' });
    }
}

export async function deleteEquipmentHandler(
    request: FastifyRequest<{ Params: DeleteEquipmentParams }>,
    reply: FastifyReply
) {
    try {
        const { siteId, id } = request.params;
        const actorUserId = request.headers['x-user-id'] as string | undefined;

        const result = await request.server.pg.query(
            `DELETE FROM equipment WHERE id = $1 AND site_id = $2 RETURNING id`,
            [id, siteId]
        );

        if (result.rowCount === 0) {
            return reply.code(404).send({ message: 'Equipment not found' });
        }

        request.server.audit.log({
            action: 'equipment:delete',
            resource: 'equipment',
            resourceId: id,
            userId: actorUserId,
            metadata: { siteId },
        });

        return reply.code(200).send({ message: 'Equipment deleted successfully' });
    } catch (error) {
        request.log.error(error, 'Error deleting equipment');
        return reply.code(500).send({ message: 'Internal Server Error' });
    }
}
