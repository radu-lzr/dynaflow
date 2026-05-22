import { FastifyRequest, FastifyReply } from 'fastify';
import { FromSchema } from 'json-schema-to-ts';
import {
    GetInterventionsSchema,
    GetInterventionByIdSchema,
    CreateInterventionSchema,
    UpdateInterventionSchema,
    DeleteInterventionSchema,
    StartInterventionSchema,
    CompleteInterventionSchema,
    DeliverInterventionSchema,
    AssignTechnicianSchema,
    CreateBenchSessionProxySchema,
} from '../schemas/interventions.schema';
import { canTransition } from '../utils/lifecycle';
import {
    createTempPermission,
    deleteTempPermissions,
    createBenchSession,
} from '../utils/service-client';

type GetInterventionsQuery = FromSchema<typeof GetInterventionsSchema.querystring>;
type GetByIdParams = FromSchema<typeof GetInterventionByIdSchema.params>;
type CreateBody = FromSchema<typeof CreateInterventionSchema.body>;
type UpdateParams = FromSchema<typeof UpdateInterventionSchema.params>;
type UpdateBody = FromSchema<typeof UpdateInterventionSchema.body>;
type DeleteParams = FromSchema<typeof DeleteInterventionSchema.params>;
type LifecycleParams = FromSchema<typeof StartInterventionSchema.params>;
type CompleteBody = FromSchema<typeof CompleteInterventionSchema.body>;
type AssignParams = FromSchema<typeof AssignTechnicianSchema.params>;
type AssignBody = FromSchema<typeof AssignTechnicianSchema.body>;
type BenchSessionParams = FromSchema<typeof CreateBenchSessionProxySchema.params>;
type BenchSessionBody = FromSchema<typeof CreateBenchSessionProxySchema.body>;

function mapRow(r: any) {
    return {
        id: r.id,
        clientVehicleId: r.client_vehicle_id,
        siteId: r.site_id,
        technicianId: r.technician_id,
        mapId: r.map_id,
        mapVersionId: r.map_version_id,
        type: r.type,
        status: r.status,
        notes: r.notes,
        startedAt: r.started_at,
        completedAt: r.completed_at,
        deliveredAt: r.delivered_at,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
    };
}

export async function getInterventionsHandler(
    request: FastifyRequest<{ Querystring: GetInterventionsQuery }>,
    reply: FastifyReply
) {
    try {
        const { page = 1, limit = 20, clientVehicleId, siteId, technicianId, mapId, status, type } = request.query;
        const offset = (page - 1) * limit;

        const conditions: string[] = [];
        const params: unknown[] = [];

        if (clientVehicleId !== undefined) {
            params.push(clientVehicleId);
            conditions.push(`client_vehicle_id = $${params.length}`);
        }
        if (siteId !== undefined) {
            params.push(siteId);
            conditions.push(`site_id = $${params.length}`);
        }
        if (technicianId !== undefined) {
            params.push(technicianId);
            conditions.push(`technician_id = $${params.length}`);
        }
        if (mapId !== undefined) {
            params.push(mapId);
            conditions.push(`map_id = $${params.length}`);
        }
        if (status !== undefined) {
            params.push(status);
            conditions.push(`status = $${params.length}`);
        }
        if (type !== undefined) {
            params.push(type);
            conditions.push(`type = $${params.length}`);
        }

        const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        const countResult = await request.server.pg.query(
            `SELECT COUNT(*) FROM interventions ${where}`,
            params
        );

        const dataParams = [...params, limit, offset];
        const result = await request.server.pg.query(
            `SELECT id, client_vehicle_id, site_id, technician_id, map_id, map_version_id,
                    type, status, notes, started_at, completed_at, delivered_at, created_at, updated_at
             FROM interventions ${where}
             ORDER BY created_at DESC
             LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
            dataParams
        );

        return reply.code(200).send({
            interventions: result.rows.map(mapRow),
            totalCount: parseInt(countResult.rows[0].count, 10),
            page,
            limit,
            message: 'Interventions retrieved successfully',
        });
    } catch (error) {
        request.log.error(error, 'Error listing interventions');
        return reply.code(500).send({ message: 'Internal Server Error' });
    }
}

export async function getInterventionByIdHandler(
    request: FastifyRequest<{ Params: GetByIdParams }>,
    reply: FastifyReply
) {
    try {
        const { id } = request.params;

        const result = await request.server.pg.query(
            `SELECT id, client_vehicle_id, site_id, technician_id, map_id, map_version_id,
                    type, status, notes, started_at, completed_at, delivered_at, created_at, updated_at
             FROM interventions WHERE id = $1`,
            [id]
        );

        if (result.rowCount === 0) {
            return reply.code(404).send({ message: 'Intervention not found' });
        }

        const historyResult = await request.server.pg.query(
            `SELECT id, from_status, to_status, changed_by, reason, changed_at
             FROM intervention_status_history
             WHERE intervention_id = $1
             ORDER BY changed_at ASC`,
            [id]
        );

        const statusHistory = historyResult.rows.map((h: any) => ({
            id: h.id,
            fromStatus: h.from_status,
            toStatus: h.to_status,
            changedBy: h.changed_by,
            reason: h.reason,
            changedAt: h.changed_at,
        }));

        return reply.code(200).send({
            ...mapRow(result.rows[0]),
            statusHistory,
            message: 'Intervention retrieved successfully',
        });
    } catch (error) {
        request.log.error(error, 'Error fetching intervention by id');
        return reply.code(500).send({ message: 'Internal Server Error' });
    }
}

export async function createInterventionHandler(
    request: FastifyRequest<{ Body: CreateBody }>,
    reply: FastifyReply
) {
    try {
        const { clientVehicleId, siteId, technicianId, mapId, mapVersionId, type, notes } = request.body;
        const actorUserId = (request.headers['x-user-id'] as string) ?? 'system';

        const result = await request.server.pg.query(
            `INSERT INTO interventions (client_vehicle_id, site_id, technician_id, map_id, map_version_id, type, notes)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING id`,
            [clientVehicleId, siteId, technicianId, mapId ?? null, mapVersionId ?? null, type, notes ?? null]
        );

        const interventionId = result.rows[0].id;

        await request.server.pg.query(
            `INSERT INTO intervention_status_history (intervention_id, from_status, to_status, changed_by)
             VALUES ($1, NULL, 'pending', $2)`,
            [interventionId, actorUserId]
        );

        if (mapId) {
            await createTempPermission(technicianId, mapId, interventionId, actorUserId, request.log);
        }

        request.server.audit.log({
            action: 'intervention:create',
            resource: 'intervention',
            resourceId: interventionId,
            userId: actorUserId,
            metadata: { clientVehicleId, siteId, technicianId, mapId, type },
        });

        return reply.code(201).send({ id: interventionId, message: 'Intervention created successfully' });
    } catch (error) {
        request.log.error(error, 'Error creating intervention');
        return reply.code(500).send({ message: 'Internal Server Error' });
    }
}

export async function updateInterventionHandler(
    request: FastifyRequest<{ Params: UpdateParams; Body: UpdateBody }>,
    reply: FastifyReply
) {
    try {
        const { id } = request.params;
        const { mapId, mapVersionId, notes } = request.body;
        const actorUserId = (request.headers['x-user-id'] as string) ?? 'system';

        const setClauses: string[] = [];
        const params: unknown[] = [];

        if (mapId !== undefined) {
            params.push(mapId);
            setClauses.push(`map_id = $${params.length}`);
        }
        if (mapVersionId !== undefined) {
            params.push(mapVersionId);
            setClauses.push(`map_version_id = $${params.length}`);
        }
        if (notes !== undefined) {
            params.push(notes);
            setClauses.push(`notes = $${params.length}`);
        }

        if (setClauses.length === 0) {
            return reply.code(400).send({ message: 'No fields to update' });
        }

        setClauses.push(`updated_at = now()`);

        params.push(id);
        const result = await request.server.pg.query(
            `UPDATE interventions SET ${setClauses.join(', ')}
             WHERE id = $${params.length}
             RETURNING id, map_id, technician_id`,
            params
        );

        if (result.rowCount === 0) {
            return reply.code(404).send({ message: 'Intervention not found' });
        }

        // If mapId changed, update temp permissions
        if (mapId !== undefined) {
            await deleteTempPermissions(id, actorUserId, request.log);
            const technicianId = result.rows[0].technician_id;
            await createTempPermission(technicianId, mapId, id, actorUserId, request.log);
        }

        request.server.audit.log({
            action: 'intervention:update',
            resource: 'intervention',
            resourceId: id,
            userId: actorUserId,
            metadata: { mapId, mapVersionId, notes },
        });

        return reply.code(200).send({ id, message: 'Intervention updated successfully' });
    } catch (error) {
        request.log.error(error, 'Error updating intervention');
        return reply.code(500).send({ message: 'Internal Server Error' });
    }
}

export async function deleteInterventionHandler(
    request: FastifyRequest<{ Params: DeleteParams }>,
    reply: FastifyReply
) {
    try {
        const { id } = request.params;
        const actorUserId = (request.headers['x-user-id'] as string) ?? 'system';

        const result = await request.server.pg.query(
            `DELETE FROM interventions WHERE id = $1 RETURNING id`,
            [id]
        );

        if (result.rowCount === 0) {
            return reply.code(404).send({ message: 'Intervention not found' });
        }

        await deleteTempPermissions(id, actorUserId, request.log);

        request.server.audit.log({
            action: 'intervention:delete',
            resource: 'intervention',
            resourceId: id,
            userId: actorUserId,
        });

        return reply.code(200).send({ message: 'Intervention deleted successfully' });
    } catch (error) {
        request.log.error(error, 'Error deleting intervention');
        return reply.code(500).send({ message: 'Internal Server Error' });
    }
}

export async function startInterventionHandler(
    request: FastifyRequest<{ Params: LifecycleParams }>,
    reply: FastifyReply
) {
    try {
        const { id } = request.params;
        const actorUserId = (request.headers['x-user-id'] as string) ?? 'system';

        const current = await request.server.pg.query(
            `SELECT status FROM interventions WHERE id = $1`,
            [id]
        );

        if (current.rowCount === 0) {
            return reply.code(404).send({ message: 'Intervention not found' });
        }

        const currentStatus = current.rows[0].status;

        if (!canTransition(currentStatus, 'in_progress')) {
            return reply.code(400).send({
                message: `Cannot start intervention in status '${currentStatus}'`,
            });
        }

        await request.server.pg.query(
            `UPDATE interventions SET status = 'in_progress', started_at = now(), updated_at = now()
             WHERE id = $1`,
            [id]
        );

        await request.server.pg.query(
            `INSERT INTO intervention_status_history (intervention_id, from_status, to_status, changed_by)
             VALUES ($1, $2, 'in_progress', $3)`,
            [id, currentStatus, actorUserId]
        );

        request.server.audit.log({
            action: 'intervention:start',
            resource: 'intervention',
            resourceId: id,
            userId: actorUserId,
            sensitive: true,
            metadata: { fromStatus: currentStatus, toStatus: 'in_progress' },
        });

        return reply.code(200).send({ id, status: 'in_progress', message: 'Intervention started successfully' });
    } catch (error) {
        request.log.error(error, 'Error starting intervention');
        return reply.code(500).send({ message: 'Internal Server Error' });
    }
}

export async function completeInterventionHandler(
    request: FastifyRequest<{ Params: LifecycleParams; Body: CompleteBody }>,
    reply: FastifyReply
) {
    try {
        const { id } = request.params;
        const { notes } = request.body;
        const actorUserId = (request.headers['x-user-id'] as string) ?? 'system';

        const current = await request.server.pg.query(
            `SELECT status, client_vehicle_id, site_id, technician_id, map_id FROM interventions WHERE id = $1`,
            [id]
        );

        if (current.rowCount === 0) {
            return reply.code(404).send({ message: 'Intervention not found' });
        }

        const intervention = current.rows[0];
        const currentStatus = intervention.status;

        if (!canTransition(currentStatus, 'completed')) {
            return reply.code(400).send({
                message: `Cannot complete intervention in status '${currentStatus}'`,
            });
        }

        const updateParams: unknown[] = [id];
        const setClauses = [`status = 'completed'`, `completed_at = now()`, `updated_at = now()`];

        if (notes !== undefined) {
            updateParams.push(notes);
            setClauses.push(`notes = $${updateParams.length}`);
        }

        await request.server.pg.query(
            `UPDATE interventions SET ${setClauses.join(', ')} WHERE id = $1`,
            updateParams
        );

        await request.server.pg.query(
            `INSERT INTO intervention_status_history (intervention_id, from_status, to_status, changed_by, reason)
             VALUES ($1, $2, 'completed', $3, $4)`,
            [id, currentStatus, actorUserId, notes ?? null]
        );

        request.server.amqp.publish('dynolab.events', 'intervention.completed', {
            interventionId: id,
            clientVehicleId: intervention.client_vehicle_id,
            siteId: intervention.site_id,
            technicianId: intervention.technician_id,
            mapId: intervention.map_id,
            completedAt: new Date().toISOString(),
        });

        await deleteTempPermissions(id, actorUserId, request.log);

        request.server.audit.log({
            action: 'intervention:complete',
            resource: 'intervention',
            resourceId: id,
            userId: actorUserId,
            sensitive: true,
            metadata: {
                fromStatus: currentStatus,
                toStatus: 'completed',
                clientVehicleId: intervention.client_vehicle_id,
                siteId: intervention.site_id,
                technicianId: intervention.technician_id,
                mapId: intervention.map_id,
            },
        });

        return reply.code(200).send({ id, status: 'completed', message: 'Intervention completed successfully' });
    } catch (error) {
        request.log.error(error, 'Error completing intervention');
        return reply.code(500).send({ message: 'Internal Server Error' });
    }
}

export async function deliverInterventionHandler(
    request: FastifyRequest<{ Params: LifecycleParams }>,
    reply: FastifyReply
) {
    try {
        const { id } = request.params;
        const actorUserId = (request.headers['x-user-id'] as string) ?? 'system';

        const current = await request.server.pg.query(
            `SELECT status FROM interventions WHERE id = $1`,
            [id]
        );

        if (current.rowCount === 0) {
            return reply.code(404).send({ message: 'Intervention not found' });
        }

        const currentStatus = current.rows[0].status;

        if (!canTransition(currentStatus, 'delivered')) {
            return reply.code(400).send({
                message: `Cannot deliver intervention in status '${currentStatus}'`,
            });
        }

        await request.server.pg.query(
            `UPDATE interventions SET status = 'delivered', delivered_at = now(), updated_at = now()
             WHERE id = $1`,
            [id]
        );

        await request.server.pg.query(
            `INSERT INTO intervention_status_history (intervention_id, from_status, to_status, changed_by)
             VALUES ($1, $2, 'delivered', $3)`,
            [id, currentStatus, actorUserId]
        );

        request.server.audit.log({
            action: 'intervention:deliver',
            resource: 'intervention',
            resourceId: id,
            userId: actorUserId,
            sensitive: true,
            metadata: { fromStatus: currentStatus, toStatus: 'delivered' },
        });

        return reply.code(200).send({ id, status: 'delivered', message: 'Intervention delivered successfully' });
    } catch (error) {
        request.log.error(error, 'Error delivering intervention');
        return reply.code(500).send({ message: 'Internal Server Error' });
    }
}

export async function assignTechnicianHandler(
    request: FastifyRequest<{ Params: AssignParams; Body: AssignBody }>,
    reply: FastifyReply
) {
    try {
        const { id } = request.params;
        const { technicianId } = request.body;
        const actorUserId = (request.headers['x-user-id'] as string) ?? 'system';

        const current = await request.server.pg.query(
            `SELECT status, technician_id, map_id FROM interventions WHERE id = $1`,
            [id]
        );

        if (current.rowCount === 0) {
            return reply.code(404).send({ message: 'Intervention not found' });
        }

        const { status, map_id: mapId } = current.rows[0];

        if (status !== 'pending' && status !== 'in_progress') {
            return reply.code(400).send({
                message: `Cannot reassign technician on intervention in status '${status}'`,
            });
        }

        await deleteTempPermissions(id, actorUserId, request.log);

        await request.server.pg.query(
            `UPDATE interventions SET technician_id = $1, updated_at = now() WHERE id = $2`,
            [technicianId, id]
        );

        await request.server.pg.query(
            `INSERT INTO intervention_status_history (intervention_id, from_status, to_status, changed_by, reason)
             VALUES ($1, $2, $2, $3, 'Technician reassigned')`,
            [id, status, actorUserId]
        );

        if (mapId) {
            await createTempPermission(technicianId, mapId, id, actorUserId, request.log);
        }

        request.server.audit.log({
            action: 'intervention:assign',
            resource: 'intervention',
            resourceId: id,
            userId: actorUserId,
            sensitive: true,
            metadata: { technicianId, mapId },
        });

        return reply.code(200).send({ id, message: 'Technician reassigned successfully' });
    } catch (error) {
        request.log.error(error, 'Error reassigning technician');
        return reply.code(500).send({ message: 'Internal Server Error' });
    }
}

export async function createBenchSessionProxyHandler(
    request: FastifyRequest<{ Params: BenchSessionParams; Body: BenchSessionBody }>,
    reply: FastifyReply
) {
    try {
        const { id } = request.params;
        const { type, benchId, notes } = request.body;
        const actorUserId = (request.headers['x-user-id'] as string) ?? 'system';

        const exists = await request.server.pg.query(
            `SELECT id FROM interventions WHERE id = $1`,
            [id]
        );

        if (exists.rowCount === 0) {
            return reply.code(404).send({ message: 'Intervention not found' });
        }

        let sessionId: string | null;
        try {
            sessionId = await createBenchSession(
                id,
                type,
                benchId ?? null,
                notes ?? null,
                actorUserId,
                request.log
            );
        } catch (error) {
            request.log.error(error, 'Telemetry Service unavailable');
            return reply.code(502).send({ message: 'Telemetry Service unavailable' });
        }

        if (sessionId === null) {
            return reply.code(502).send({ message: 'Telemetry Service unavailable' });
        }

        request.server.audit.log({
            action: 'intervention:bench_session',
            resource: 'intervention',
            resourceId: id,
            userId: actorUserId,
            metadata: { sessionId, type, benchId },
        });

        return reply.code(201).send({ sessionId, message: 'Bench session created successfully' });
    } catch (error) {
        request.log.error(error, 'Error creating bench session proxy');
        return reply.code(500).send({ message: 'Internal Server Error' });
    }
}
