import { FastifyRequest, FastifyReply } from 'fastify';
import { FromSchema } from 'json-schema-to-ts';
import {
    CreateBenchSessionSchema,
    GetBenchSessionsSchema,
    CompareBenchSessionsSchema,
    GetBenchSessionByIdSchema,
    UpdateBenchSessionSchema,
    DeleteBenchSessionSchema,
} from '../schemas/bench-sessions.schema';

type CreateBenchSessionBody = FromSchema<typeof CreateBenchSessionSchema.body>;
type GetBenchSessionsQuery = FromSchema<typeof GetBenchSessionsSchema.querystring>;
type CompareBenchSessionsQuery = FromSchema<typeof CompareBenchSessionsSchema.querystring>;
type GetBenchSessionByIdParams = FromSchema<typeof GetBenchSessionByIdSchema.params>;
type UpdateBenchSessionParams = FromSchema<typeof UpdateBenchSessionSchema.params>;
type UpdateBenchSessionBody = FromSchema<typeof UpdateBenchSessionSchema.body>;
type DeleteBenchSessionParams = FromSchema<typeof DeleteBenchSessionSchema.params>;

export async function createBenchSessionHandler(
    request: FastifyRequest<{ Body: CreateBenchSessionBody }>,
    reply: FastifyReply
) {
    try {
        const { interventionId, type, benchId, notes, startedAt } = request.body;
        const actorUserId = request.headers['x-user-id'] as string | undefined;

        const result = await request.server.pg.query(
            `INSERT INTO bench_sessions (intervention_id, type, bench_id, notes, started_at)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id`,
            [interventionId, type, benchId ?? null, notes ?? null, startedAt]
        );

        const sessionId = result.rows[0].id;

        request.server.audit.log({
            action: 'bench_session:create',
            resource: 'bench_session',
            resourceId: sessionId,
            userId: actorUserId,
            metadata: { interventionId },
        });

        return reply.code(201).send({ id: sessionId, message: 'Bench session created successfully' });
    } catch (error) {
        request.log.error(error, 'Error creating bench session');
        return reply.code(500).send({ message: 'Internal Server Error' });
    }
}

export async function getBenchSessionsHandler(
    request: FastifyRequest<{ Querystring: GetBenchSessionsQuery }>,
    reply: FastifyReply
) {
    try {
        const { page = 1, limit = 20, interventionId, type } = request.query;
        const offset = (page - 1) * limit;

        const conditions: string[] = [];
        const params: unknown[] = [];

        if (interventionId !== undefined) {
            params.push(interventionId);
            conditions.push(`intervention_id = $${params.length}`);
        }

        if (type !== undefined) {
            params.push(type);
            conditions.push(`type = $${params.length}`);
        }

        const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        const countResult = await request.server.pg.query(
            `SELECT COUNT(*) FROM bench_sessions ${where}`,
            params
        );

        const dataParams = [...params, limit, offset];
        const result = await request.server.pg.query(
            `SELECT id, intervention_id, type, bench_id, peak_hp, peak_torque, notes, started_at, ended_at, created_at
             FROM bench_sessions ${where}
             ORDER BY created_at DESC
             LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
            dataParams
        );

        const sessions = result.rows.map((r: any) => ({
            id: r.id,
            interventionId: r.intervention_id,
            type: r.type,
            benchId: r.bench_id,
            peakHp: r.peak_hp !== null ? parseFloat(r.peak_hp) : null,
            peakTorque: r.peak_torque !== null ? parseFloat(r.peak_torque) : null,
            notes: r.notes,
            startedAt: r.started_at,
            endedAt: r.ended_at,
            createdAt: r.created_at,
        }));

        return reply.code(200).send({
            sessions,
            totalCount: parseInt(countResult.rows[0].count, 10),
            page,
            limit,
            message: 'Bench sessions retrieved successfully',
        });
    } catch (error) {
        request.log.error(error, 'Error fetching bench sessions');
        return reply.code(500).send({ message: 'Internal Server Error' });
    }
}

export async function compareBenchSessionsHandler(
    request: FastifyRequest<{ Querystring: CompareBenchSessionsQuery }>,
    reply: FastifyReply
) {
    try {
        const { interventionId } = request.query;

        const result = await request.server.pg.query(
            `SELECT id, type, peak_hp, peak_torque
             FROM bench_sessions
             WHERE intervention_id = $1
             AND type IN ('before', 'after')`,
            [interventionId]
        );

        if (result.rowCount === 0) {
            return reply.code(404).send({ message: 'No bench sessions found for this intervention' });
        }

        let before: { sessionId: string; peakHp: number | null; peakTorque: number | null } | null = null;
        let after: { sessionId: string; peakHp: number | null; peakTorque: number | null } | null = null;

        for (const row of result.rows) {
            const entry = {
                sessionId: row.id,
                peakHp: row.peak_hp !== null ? parseFloat(row.peak_hp) : null,
                peakTorque: row.peak_torque !== null ? parseFloat(row.peak_torque) : null,
            };
            if (row.type === 'before') before = entry;
            else if (row.type === 'after') after = entry;
        }

        let gains: { hp: number; torque: number; hpPercent: number; torquePercent: number } | null = null;

        if (
            before !== null && after !== null &&
            before.peakHp !== null && after.peakHp !== null &&
            before.peakTorque !== null && after.peakTorque !== null
        ) {
            const hp = after.peakHp - before.peakHp;
            const torque = after.peakTorque - before.peakTorque;
            gains = {
                hp: parseFloat(hp.toFixed(2)),
                torque: parseFloat(torque.toFixed(2)),
                hpPercent: parseFloat(((hp / before.peakHp) * 100).toFixed(2)),
                torquePercent: parseFloat(((torque / before.peakTorque) * 100).toFixed(2)),
            };
        }

        return reply.code(200).send({
            before,
            after,
            gains,
            message: 'Comparison retrieved successfully',
        });
    } catch (error) {
        request.log.error(error, 'Error comparing bench sessions');
        return reply.code(500).send({ message: 'Internal Server Error' });
    }
}

export async function getBenchSessionByIdHandler(
    request: FastifyRequest<{ Params: GetBenchSessionByIdParams }>,
    reply: FastifyReply
) {
    try {
        const { id } = request.params;

        const result = await request.server.pg.query(
            `SELECT id, intervention_id, type, bench_id, peak_hp, peak_torque, notes, started_at, ended_at, created_at
             FROM bench_sessions WHERE id = $1`,
            [id]
        );

        if (result.rowCount === 0) {
            return reply.code(404).send({ message: 'Bench session not found' });
        }

        const row = result.rows[0];

        const counts = await request.server.pg.query(
            `SELECT
                (SELECT COUNT(*) FROM dyno_datapoints WHERE session_id = $1) AS datapoint_count,
                (SELECT COUNT(*) FROM obd_logs WHERE session_id = $1) AS obd_log_count`,
            [id]
        );

        return reply.code(200).send({
            id: row.id,
            interventionId: row.intervention_id,
            type: row.type,
            benchId: row.bench_id,
            peakHp: row.peak_hp !== null ? parseFloat(row.peak_hp) : null,
            peakTorque: row.peak_torque !== null ? parseFloat(row.peak_torque) : null,
            notes: row.notes,
            startedAt: row.started_at,
            endedAt: row.ended_at,
            createdAt: row.created_at,
            datapointCount: parseInt(counts.rows[0].datapoint_count, 10),
            obdLogCount: parseInt(counts.rows[0].obd_log_count, 10),
            message: 'Bench session retrieved successfully',
        });
    } catch (error) {
        request.log.error(error, 'Error fetching bench session by id');
        return reply.code(500).send({ message: 'Internal Server Error' });
    }
}

export async function updateBenchSessionHandler(
    request: FastifyRequest<{ Params: UpdateBenchSessionParams; Body: UpdateBenchSessionBody }>,
    reply: FastifyReply
) {
    try {
        const { id } = request.params;
        const { peakHp, peakTorque, notes, endedAt } = request.body;
        const actorUserId = request.headers['x-user-id'] as string | undefined;

        const setClauses: string[] = [];
        const params: unknown[] = [];

        if (peakHp !== undefined) {
            params.push(peakHp);
            setClauses.push(`peak_hp = $${params.length}`);
        }
        if (peakTorque !== undefined) {
            params.push(peakTorque);
            setClauses.push(`peak_torque = $${params.length}`);
        }
        if (notes !== undefined) {
            params.push(notes);
            setClauses.push(`notes = $${params.length}`);
        }
        if (endedAt !== undefined) {
            params.push(endedAt);
            setClauses.push(`ended_at = $${params.length}`);
        }

        if (setClauses.length === 0) {
            return reply.code(400).send({ message: 'No fields to update' });
        }

        params.push(id);
        const result = await request.server.pg.query(
            `UPDATE bench_sessions SET ${setClauses.join(', ')}
             WHERE id = $${params.length}
             RETURNING id`,
            params
        );

        if (result.rowCount === 0) {
            return reply.code(404).send({ message: 'Bench session not found' });
        }

        request.server.audit.log({
            action: 'bench_session:update',
            resource: 'bench_session',
            resourceId: id,
            userId: actorUserId,
        });

        return reply.code(200).send({ id: result.rows[0].id, message: 'Bench session updated successfully' });
    } catch (error) {
        request.log.error(error, 'Error updating bench session');
        return reply.code(500).send({ message: 'Internal Server Error' });
    }
}

export async function deleteBenchSessionHandler(
    request: FastifyRequest<{ Params: DeleteBenchSessionParams }>,
    reply: FastifyReply
) {
    try {
        const { id } = request.params;
        const actorUserId = request.headers['x-user-id'] as string | undefined;

        const result = await request.server.pg.query(
            `DELETE FROM bench_sessions WHERE id = $1 RETURNING id`,
            [id]
        );

        if (result.rowCount === 0) {
            return reply.code(404).send({ message: 'Bench session not found' });
        }

        request.server.audit.log({
            action: 'bench_session:delete',
            resource: 'bench_session',
            resourceId: id,
            userId: actorUserId,
        });

        return reply.code(200).send({ message: 'Bench session deleted successfully' });
    } catch (error) {
        request.log.error(error, 'Error deleting bench session');
        return reply.code(500).send({ message: 'Internal Server Error' });
    }
}
