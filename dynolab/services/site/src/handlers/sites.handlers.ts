import { FastifyRequest, FastifyReply } from 'fastify';
import { FromSchema } from 'json-schema-to-ts';
import {
    GetSitesSchema,
    GetSiteByIdSchema,
    CreateSiteSchema,
    UpdateSiteSchema,
    DeleteSiteSchema,
} from '../schemas/sites.schema';

type GetSitesQuery = FromSchema<typeof GetSitesSchema.querystring>;
type GetSiteByIdParams = FromSchema<typeof GetSiteByIdSchema.params>;
type CreateSiteBody = FromSchema<typeof CreateSiteSchema.body>;
type UpdateSiteParams = FromSchema<typeof UpdateSiteSchema.params>;
type UpdateSiteBody = FromSchema<typeof UpdateSiteSchema.body>;
type DeleteSiteParams = FromSchema<typeof DeleteSiteSchema.params>;

export async function getSitesHandler(
    request: FastifyRequest<{ Querystring: GetSitesQuery }>,
    reply: FastifyReply
) {
    try {
        const { page = 1, limit = 10, isActive, search } = request.query;
        const offset = (page - 1) * limit;

        const conditions: string[] = [];
        const params: unknown[] = [];

        if (search) {
            params.push(`%${search}%`);
            const i = params.length;
            conditions.push(`(name ILIKE $${i} OR city ILIKE $${i})`);
        }

        if (isActive !== undefined) {
            params.push(isActive);
            conditions.push(`is_active = $${params.length}`);
        }

        const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        const countResult = await request.server.pg.query(
            `SELECT COUNT(*) FROM sites ${where}`,
            params
        );

        const dataParams = [...params, limit, offset];
        const result = await request.server.pg.query(
            `SELECT id, name, address, city, country, is_active, created_at, updated_at
             FROM sites ${where}
             ORDER BY created_at DESC
             LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
            dataParams
        );

        const items = result.rows.map((r: any) => ({
            id: r.id,
            name: r.name,
            address: r.address,
            city: r.city,
            country: r.country,
            isActive: r.is_active,
            createdAt: r.created_at,
            updatedAt: r.updated_at,
        }));

        return reply.code(200).send({
            items,
            totalCount: parseInt(countResult.rows[0].count, 10),
            page,
            limit,
            message: 'Sites retrieved successfully',
        });
    } catch (error) {
        request.log.error(error, 'Error fetching sites');
        return reply.code(500).send({ message: 'Internal Server Error' });
    }
}

export async function getSiteByIdHandler(
    request: FastifyRequest<{ Params: GetSiteByIdParams }>,
    reply: FastifyReply
) {
    try {
        const { id } = request.params;

        const result = await request.server.pg.query(
            `SELECT id, name, address, city, country, is_active, created_at, updated_at
             FROM sites WHERE id = $1`,
            [id]
        );

        if (result.rowCount === 0) {
            return reply.code(404).send({ message: 'Site not found' });
        }

        const row = result.rows[0];

        const counts = await request.server.pg.query(
            `SELECT
                (SELECT COUNT(*) FROM equipment WHERE site_id = $1) AS equipment_count,
                (SELECT COUNT(*) FROM site_members WHERE site_id = $1) AS member_count`,
            [id]
        );

        return reply.code(200).send({
            id: row.id,
            name: row.name,
            address: row.address,
            city: row.city,
            country: row.country,
            isActive: row.is_active,
            equipmentCount: parseInt(counts.rows[0].equipment_count, 10),
            memberCount: parseInt(counts.rows[0].member_count, 10),
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            message: 'Site retrieved successfully',
        });
    } catch (error) {
        request.log.error(error, 'Error fetching site by id');
        return reply.code(500).send({ message: 'Internal Server Error' });
    }
}

export async function createSiteHandler(
    request: FastifyRequest<{ Body: CreateSiteBody }>,
    reply: FastifyReply
) {
    try {
        const { name, address, city, country } = request.body;
        const actorUserId = request.headers['x-user-id'] as string | undefined;

        const result = await request.server.pg.query(
            `INSERT INTO sites (name, address, city, country)
             VALUES ($1, $2, $3, $4)
             RETURNING id`,
            [name, address ?? null, city ?? null, country ?? null]
        );

        const siteId = result.rows[0].id;

        request.server.audit.log({
            action: 'site:create',
            resource: 'site',
            resourceId: siteId,
            userId: actorUserId,
        });

        return reply.code(201).send({ id: siteId, message: 'Site created successfully' });
    } catch (error) {
        request.log.error(error, 'Error creating site');
        return reply.code(500).send({ message: 'Internal Server Error' });
    }
}

export async function updateSiteHandler(
    request: FastifyRequest<{ Params: UpdateSiteParams; Body: UpdateSiteBody }>,
    reply: FastifyReply
) {
    try {
        const { id } = request.params;
        const { name, address, city, country } = request.body;
        const actorUserId = request.headers['x-user-id'] as string | undefined;

        const setClauses: string[] = [];
        const params: unknown[] = [];

        if (name !== undefined) {
            params.push(name);
            setClauses.push(`name = $${params.length}`);
        }
        if (address !== undefined) {
            params.push(address);
            setClauses.push(`address = $${params.length}`);
        }
        if (city !== undefined) {
            params.push(city);
            setClauses.push(`city = $${params.length}`);
        }
        if (country !== undefined) {
            params.push(country);
            setClauses.push(`country = $${params.length}`);
        }

        if (setClauses.length === 0) {
            return reply.code(400).send({ message: 'No fields to update' });
        }

        params.push(id);
        const result = await request.server.pg.query(
            `UPDATE sites SET ${setClauses.join(', ')}, updated_at = NOW()
             WHERE id = $${params.length}
             RETURNING id, name, address, city, country`,
            params
        );

        if (result.rowCount === 0) {
            return reply.code(404).send({ message: 'Site not found' });
        }

        const row = result.rows[0];

        request.server.audit.log({
            action: 'site:update',
            resource: 'site',
            resourceId: id,
            userId: actorUserId,
        });

        return reply.code(200).send({
            id: row.id,
            name: row.name,
            address: row.address,
            city: row.city,
            country: row.country,
            message: 'Site updated successfully',
        });
    } catch (error) {
        request.log.error(error, 'Error updating site');
        return reply.code(500).send({ message: 'Internal Server Error' });
    }
}

export async function deleteSiteHandler(
    request: FastifyRequest<{ Params: DeleteSiteParams }>,
    reply: FastifyReply
) {
    try {
        const { id } = request.params;
        const actorUserId = request.headers['x-user-id'] as string | undefined;

        const result = await request.server.pg.query(
            `UPDATE sites SET is_active = false, updated_at = NOW()
             WHERE id = $1 AND is_active = true
             RETURNING id`,
            [id]
        );

        if (result.rowCount === 0) {
            const exists = await request.server.pg.query(
                'SELECT id FROM sites WHERE id = $1',
                [id]
            );
            if (exists.rowCount === 0) {
                return reply.code(404).send({ message: 'Site not found' });
            }
            return reply.code(200).send({ message: 'Site already deactivated' });
        }

        request.server.audit.log({
            action: 'site:delete',
            resource: 'site',
            resourceId: id,
            userId: actorUserId,
        });

        return reply.code(200).send({ message: 'Site deactivated successfully' });
    } catch (error) {
        request.log.error(error, 'Error deleting site');
        return reply.code(500).send({ message: 'Internal Server Error' });
    }
}
