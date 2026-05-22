import { FastifyRequest, FastifyReply } from 'fastify';
import { FromSchema } from 'json-schema-to-ts';
import {
    AddDatapointsSchema,
    GetDatapointsSchema,
    DeleteDatapointsSchema,
} from '../schemas/datapoints.schema';

type AddDatapointsParams = FromSchema<typeof AddDatapointsSchema.params>;
type AddDatapointsBody = FromSchema<typeof AddDatapointsSchema.body>;
type GetDatapointsParams = FromSchema<typeof GetDatapointsSchema.params>;
type GetDatapointsQuery = FromSchema<typeof GetDatapointsSchema.querystring>;
type DeleteDatapointsParams = FromSchema<typeof DeleteDatapointsSchema.params>;

export async function addDatapointsHandler(
    request: FastifyRequest<{ Params: AddDatapointsParams; Body: AddDatapointsBody }>,
    reply: FastifyReply
) {
    try {
        const { sessionId } = request.params;
        const { datapoints } = request.body;

        const sessionCheck = await request.server.pg.query(
            'SELECT id FROM bench_sessions WHERE id = $1',
            [sessionId]
        );
        if (sessionCheck.rowCount === 0) {
            return reply.code(404).send({ message: 'Bench session not found' });
        }

        const values: unknown[] = [];
        const placeholders: string[] = [];

        datapoints.forEach((dp, i) => {
            const offset = i * 12;
            placeholders.push(
                `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11}, $${offset + 12})`
            );
            values.push(
                sessionId, dp.timestamp, dp.rpm ?? null, dp.horsepower ?? null, dp.torque ?? null,
                dp.boostPressure ?? null, dp.intakeTemp ?? null, dp.exhaustTemp ?? null,
                dp.afr ?? null, dp.knockCount ?? null, dp.oilTemp ?? null, dp.coolantTemp ?? null
            );
        });

        await request.server.pg.query(
            `INSERT INTO dyno_datapoints (session_id, timestamp, rpm, horsepower, torque, boost_pressure, intake_temp, exhaust_temp, afr, knock_count, oil_temp, coolant_temp)
             VALUES ${placeholders.join(', ')}`,
            values
        );

        return reply.code(201).send({
            insertedCount: datapoints.length,
            message: `${datapoints.length} datapoints inserted successfully`,
        });
    } catch (error) {
        request.log.error(error, 'Error adding datapoints');
        return reply.code(500).send({ message: 'Internal Server Error' });
    }
}

export async function getDatapointsHandler(
    request: FastifyRequest<{ Params: GetDatapointsParams; Querystring: GetDatapointsQuery }>,
    reply: FastifyReply
) {
    try {
        const { sessionId } = request.params;
        const { from, to, downsample } = request.query;

        const sessionCheck = await request.server.pg.query(
            'SELECT id FROM bench_sessions WHERE id = $1',
            [sessionId]
        );
        if (sessionCheck.rowCount === 0) {
            return reply.code(404).send({ message: 'Bench session not found' });
        }

        // totalCount is always the full count for the session (not filtered by time range)
        // so clients know the full dataset size regardless of what window they requested
        const countResult = await request.server.pg.query(
            `SELECT COUNT(*) FROM dyno_datapoints WHERE session_id = $1`,
            [sessionId]
        );
        const totalCount = parseInt(countResult.rows[0].count, 10);

        const conditions: string[] = ['session_id = $1'];
        const params: unknown[] = [sessionId];

        if (from !== undefined) {
            params.push(from);
            conditions.push(`timestamp >= $${params.length}`);
        }
        if (to !== undefined) {
            params.push(to);
            conditions.push(`timestamp <= $${params.length}`);
        }

        const where = `WHERE ${conditions.join(' AND ')}`;

        let rows: any[];
        if (downsample !== undefined) {
            params.push(downsample);
            const result = await request.server.pg.query(
                `SELECT * FROM (
                    SELECT session_id, timestamp, rpm, horsepower, torque, boost_pressure, intake_temp, exhaust_temp, afr, knock_count, oil_temp, coolant_temp,
                           ROW_NUMBER() OVER (ORDER BY timestamp ASC) AS rn
                    FROM dyno_datapoints ${where}
                ) sub
                WHERE sub.rn % $${params.length} = 0
                ORDER BY timestamp ASC`,
                params
            );
            rows = result.rows;
        } else {
            const result = await request.server.pg.query(
                `SELECT session_id, timestamp, rpm, horsepower, torque, boost_pressure, intake_temp, exhaust_temp, afr, knock_count, oil_temp, coolant_temp
                 FROM dyno_datapoints ${where}
                 ORDER BY timestamp ASC`,
                params
            );
            rows = result.rows;
        }

        const datapoints = rows.map((r: any) => ({
            sessionId: r.session_id,
            timestamp: r.timestamp,
            rpm: r.rpm,
            horsepower: r.horsepower !== null ? parseFloat(r.horsepower) : null,
            torque: r.torque !== null ? parseFloat(r.torque) : null,
            boostPressure: r.boost_pressure !== null ? parseFloat(r.boost_pressure) : null,
            intakeTemp: r.intake_temp !== null ? parseFloat(r.intake_temp) : null,
            exhaustTemp: r.exhaust_temp !== null ? parseFloat(r.exhaust_temp) : null,
            afr: r.afr !== null ? parseFloat(r.afr) : null,
            knockCount: r.knock_count,
            oilTemp: r.oil_temp !== null ? parseFloat(r.oil_temp) : null,
            coolantTemp: r.coolant_temp !== null ? parseFloat(r.coolant_temp) : null,
        }));

        return reply.code(200).send({
            datapoints,
            totalCount,
            message: 'Datapoints retrieved successfully',
        });
    } catch (error) {
        request.log.error(error, 'Error fetching datapoints');
        return reply.code(500).send({ message: 'Internal Server Error' });
    }
}

export async function deleteDatapointsHandler(
    request: FastifyRequest<{ Params: DeleteDatapointsParams }>,
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
            `DELETE FROM dyno_datapoints WHERE session_id = $1`,
            [sessionId]
        );

        request.server.audit.log({
            action: 'dyno_datapoints:delete',
            resource: 'dyno_datapoints',
            resourceId: sessionId,
            userId: actorUserId,
            metadata: { sessionId },
        });

        return reply.code(200).send({
            deletedCount: result.rowCount ?? 0,
            message: 'Datapoints deleted successfully',
        });
    } catch (error) {
        request.log.error(error, 'Error deleting datapoints');
        return reply.code(500).send({ message: 'Internal Server Error' });
    }
}
