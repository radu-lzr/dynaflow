import { FastifyRequest, FastifyReply } from 'fastify';
import { FromSchema } from 'json-schema-to-ts';
import {
    GetClientVehiclesSchema,
    GetClientVehicleByIdSchema,
    CreateClientVehicleSchema,
    UpdateClientVehicleSchema,
    DeleteClientVehicleSchema,
} from '../schemas/client-vehicles.schema';

type GetClientVehiclesQuery = FromSchema<typeof GetClientVehiclesSchema.querystring>;
type GetClientVehicleByIdParams = FromSchema<typeof GetClientVehicleByIdSchema.params>;
type CreateClientVehicleBody = FromSchema<typeof CreateClientVehicleSchema.body>;
type UpdateClientVehicleParams = FromSchema<typeof UpdateClientVehicleSchema.params>;
type UpdateClientVehicleBody = FromSchema<typeof UpdateClientVehicleSchema.body>;
type DeleteClientVehicleParams = FromSchema<typeof DeleteClientVehicleSchema.params>;

export async function getClientVehiclesHandler(
    request: FastifyRequest<{ Querystring: GetClientVehiclesQuery }>,
    reply: FastifyReply
) {
    try {
        const { page = 1, limit = 20, ownerId, configId, search } = request.query;
        const offset = (page - 1) * limit;

        const conditions: string[] = [];
        const params: unknown[] = [];

        if (ownerId !== undefined) {
            params.push(ownerId);
            conditions.push(`owner_id = $${params.length}`);
        }

        if (configId !== undefined) {
            params.push(configId);
            conditions.push(`config_id = $${params.length}`);
        }

        if (search) {
            params.push(`%${search}%`);
            const i = params.length;
            conditions.push(`(vin ILIKE $${i} OR plate_number ILIKE $${i})`);
        }

        const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        const countResult = await request.server.pg.query(
            `SELECT COUNT(*) FROM client_vehicles ${where}`,
            params
        );

        const dataParams = [...params, limit, offset];
        const result = await request.server.pg.query(
            `SELECT id, owner_id, config_id, vin, plate_number, mileage, notes, created_at, updated_at
             FROM client_vehicles ${where}
             ORDER BY created_at DESC
             LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
            dataParams
        );

        const vehicles = result.rows.map((r: any) => ({
            id: r.id,
            ownerId: r.owner_id,
            configId: r.config_id,
            vin: r.vin,
            plateNumber: r.plate_number,
            mileage: r.mileage,
            notes: r.notes,
            createdAt: r.created_at,
            updatedAt: r.updated_at,
        }));

        return reply.code(200).send({
            vehicles,
            totalCount: parseInt(countResult.rows[0].count, 10),
            page,
            limit,
            message: 'Client vehicles retrieved successfully',
        });
    } catch (error) {
        request.log.error(error, 'Error fetching client vehicles');
        return reply.code(500).send({ message: 'Internal Server Error' });
    }
}

export async function getClientVehicleByIdHandler(
    request: FastifyRequest<{ Params: GetClientVehicleByIdParams }>,
    reply: FastifyReply
) {
    try {
        const { id } = request.params;

        const vehicleResult = await request.server.pg.query(
            `SELECT id, owner_id, config_id, vin, plate_number, mileage, notes, created_at, updated_at
             FROM client_vehicles WHERE id = $1`,
            [id]
        );

        if (vehicleResult.rowCount === 0) {
            return reply.code(404).send({ message: 'Client vehicle not found' });
        }

        const row = vehicleResult.rows[0];

        const modsResult = await request.server.pg.query(
            `SELECT id, vehicle_id, category, description, installed_at, created_at
             FROM vehicle_modifications WHERE vehicle_id = $1 ORDER BY created_at DESC`,
            [id]
        );

        const modifications = modsResult.rows.map((m: any) => ({
            id: m.id,
            vehicleId: m.vehicle_id,
            category: m.category,
            description: m.description,
            installedAt: m.installed_at,
            createdAt: m.created_at,
        }));

        return reply.code(200).send({
            id: row.id,
            ownerId: row.owner_id,
            configId: row.config_id,
            vin: row.vin,
            plateNumber: row.plate_number,
            mileage: row.mileage,
            notes: row.notes,
            modifications,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            message: 'Client vehicle retrieved successfully',
        });
    } catch (error) {
        request.log.error(error, 'Error fetching client vehicle by id');
        return reply.code(500).send({ message: 'Internal Server Error' });
    }
}

export async function createClientVehicleHandler(
    request: FastifyRequest<{ Body: CreateClientVehicleBody }>,
    reply: FastifyReply
) {
    try {
        const { ownerId, configId, vin, plateNumber, mileage, notes } = request.body;
        const actorUserId = request.headers['x-user-id'] as string | undefined;

        const existing = await request.server.pg.query(
            'SELECT id FROM client_vehicles WHERE vin = $1',
            [vin]
        );
        if ((existing.rowCount ?? 0) > 0) {
            return reply.code(409).send({ message: 'VIN already registered' });
        }

        const result = await request.server.pg.query(
            `INSERT INTO client_vehicles (owner_id, config_id, vin, plate_number, mileage, notes)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING id`,
            [ownerId, configId, vin, plateNumber ?? null, mileage ?? null, notes ?? null]
        );

        const vehicleId = result.rows[0].id;

        request.server.audit.log({
            action: 'client_vehicle:create',
            resource: 'client_vehicle',
            resourceId: vehicleId,
            userId: actorUserId,
            metadata: { ownerId },
        });

        return reply.code(201).send({ id: vehicleId, message: 'Client vehicle registered successfully' });
    } catch (error) {
        request.log.error(error, 'Error creating client vehicle');
        return reply.code(500).send({ message: 'Internal Server Error' });
    }
}

export async function updateClientVehicleHandler(
    request: FastifyRequest<{ Params: UpdateClientVehicleParams; Body: UpdateClientVehicleBody }>,
    reply: FastifyReply
) {
    try {
        const { id } = request.params;
        const { plateNumber, mileage, notes } = request.body;
        const actorUserId = request.headers['x-user-id'] as string | undefined;

        const setClauses: string[] = [];
        const params: unknown[] = [];

        if (plateNumber !== undefined) {
            params.push(plateNumber);
            setClauses.push(`plate_number = $${params.length}`);
        }
        if (mileage !== undefined) {
            params.push(mileage);
            setClauses.push(`mileage = $${params.length}`);
        }
        if (notes !== undefined) {
            params.push(notes);
            setClauses.push(`notes = $${params.length}`);
        }

        if (setClauses.length === 0) {
            return reply.code(400).send({ message: 'No fields to update' });
        }

        params.push(id);
        const result = await request.server.pg.query(
            `UPDATE client_vehicles SET ${setClauses.join(', ')}, updated_at = NOW()
             WHERE id = $${params.length}
             RETURNING id`,
            params
        );

        if (result.rowCount === 0) {
            return reply.code(404).send({ message: 'Client vehicle not found' });
        }

        request.server.audit.log({
            action: 'client_vehicle:update',
            resource: 'client_vehicle',
            resourceId: id,
            userId: actorUserId,
        });

        return reply.code(200).send({ id: result.rows[0].id, message: 'Client vehicle updated successfully' });
    } catch (error) {
        request.log.error(error, 'Error updating client vehicle');
        return reply.code(500).send({ message: 'Internal Server Error' });
    }
}

export async function deleteClientVehicleHandler(
    request: FastifyRequest<{ Params: DeleteClientVehicleParams }>,
    reply: FastifyReply
) {
    try {
        const { id } = request.params;
        const actorUserId = request.headers['x-user-id'] as string | undefined;

        const result = await request.server.pg.query(
            `DELETE FROM client_vehicles WHERE id = $1 RETURNING id`,
            [id]
        );

        if (result.rowCount === 0) {
            return reply.code(404).send({ message: 'Client vehicle not found' });
        }

        request.server.audit.log({
            action: 'client_vehicle:delete',
            resource: 'client_vehicle',
            resourceId: id,
            userId: actorUserId,
        });

        return reply.code(200).send({ message: 'Client vehicle deleted successfully' });
    } catch (error) {
        request.log.error(error, 'Error deleting client vehicle');
        return reply.code(500).send({ message: 'Internal Server Error' });
    }
}
