import { FastifyRequest, FastifyReply } from 'fastify';
import { FromSchema } from 'json-schema-to-ts';
import {
    AddObdLogsSchema,
    GetObdLogsSchema,
    DeleteObdLogsSchema,
} from '../schemas/obd-logs.schema';

type AddObdLogsParams = FromSchema<typeof AddObdLogsSchema.params>;
type AddObdLogsBody = FromSchema<typeof AddObdLogsSchema.body>;
type GetObdLogsParams = FromSchema<typeof GetObdLogsSchema.params>;
type GetObdLogsQuery = FromSchema<typeof GetObdLogsSchema.querystring>;
type DeleteObdLogsParams = FromSchema<typeof DeleteObdLogsSchema.params>;

export async function addObdLogsHandler(
    request: FastifyRequest<{ Params: AddObdLogsParams; Body: AddObdLogsBody }>,
    reply: FastifyReply
) {
    try {
        const { sessionId } = request.params;
        const { logs } = request.body;

        const sessionCheck = await request.server.pg.query(
            'SELECT id FROM bench_sessions WHERE id = $1',
            [sessionId]
        );
        if (sessionCheck.rowCount === 0) {
            return reply.code(404).send({ message: 'Bench session not found' });
        }

        const values: unknown[] = [];
        const placeholders: string[] = [];

        logs.forEach((log, i) => {
            const offset = i * 5;
            placeholders.push(
                `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5})`
            );
            values.push(sessionId, log.timestamp, log.pid, log.value, log.unit ?? null);
        });

        await request.server.pg.query(
            `INSERT INTO obd_logs (session_id, timestamp, pid, value, unit)
             VALUES ${placeholders.join(', ')}`,
            values
        );

        return reply.code(201).send({
            insertedCount: logs.length,
            message: `${logs.length} OBD log entries inserted successfully`,
        });
    } catch (error) {
        request.log.error(error, 'Error adding OBD logs');
        return reply.code(500).send({ message: 'Internal Server Error' });
    }
}

export async function getObdLogsHandler(
    request: FastifyRequest<{ Params: GetObdLogsParams; Querystring: GetObdLogsQuery }>,
    reply: FastifyReply
) {
    try {
        const { sessionId } = request.params;
        const { pid, from, to } = request.query;

        const sessionCheck = await request.server.pg.query(
            'SELECT id FROM bench_sessions WHERE id = $1',
            [sessionId]
        );
        if (sessionCheck.rowCount === 0) {
            return reply.code(404).send({ message: 'Bench session not found' });
        }

        const conditions: string[] = ['session_id = $1'];
        const params: unknown[] = [sessionId];

        if (pid !== undefined) {
            params.push(pid);
            conditions.push(`pid = $${params.length}`);
        }
        if (from !== undefined) {
            params.push(from);
            conditions.push(`timestamp >= $${params.length}`);
        }
        if (to !== undefined) {
            params.push(to);
            conditions.push(`timestamp <= $${params.length}`);
        }

        const where = `WHERE ${conditions.join(' AND ')}`;

        const countResult = await request.server.pg.query(
            `SELECT COUNT(*) FROM obd_logs ${where}`,
            params
        );

        const result = await request.server.pg.query(
            `SELECT session_id, timestamp, pid, value, unit
             FROM obd_logs ${where}
             ORDER BY timestamp ASC`,
            params
        );

        const logs = result.rows.map((r: any) => ({
            sessionId: r.session_id,
            timestamp: r.timestamp,
            pid: r.pid,
            value: parseFloat(r.value),
            unit: r.unit,
        }));

        return reply.code(200).send({
            logs,
            totalCount: parseInt(countResult.rows[0].count, 10),
            message: 'OBD logs retrieved successfully',
        });
    } catch (error) {
        request.log.error(error, 'Error fetching OBD logs');
        return reply.code(500).send({ message: 'Internal Server Error' });
    }
}

export async function deleteObdLogsHandler(
    request: FastifyRequest<{ Params: DeleteObdLogsParams }>,
    reply: FastifyReply
) {
    try {
        const { sessionId } = request.params;
        const actorUserId = request.headers['x-user-id'] as string | undefined;

        const sessionCheck = await request.server.pg.query(
            'SELECT id FROM bench_sessions WHERE id = $1',
            [sessionId]
        );
        if (sessionCheck.rowCount === 0) {
            return reply.code(404).send({ message: 'Bench session not found' });
        }

        const result = await request.server.pg.query(
            `DELETE FROM obd_logs WHERE session_id = $1`,
            [sessionId]
        );

        request.server.audit.log({
            action: 'obd_logs:delete',
            resource: 'obd_logs',
            resourceId: sessionId,
            userId: actorUserId,
            metadata: { sessionId },
        });

        return reply.code(200).send({
            deletedCount: result.rowCount ?? 0,
            message: 'OBD logs deleted successfully',
        });
    } catch (error) {
        request.log.error(error, 'Error deleting OBD logs');
        return reply.code(500).send({ message: 'Internal Server Error' });
    }
}
