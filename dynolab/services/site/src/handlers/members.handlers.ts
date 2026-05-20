import { FastifyRequest, FastifyReply } from 'fastify';
import { FromSchema } from 'json-schema-to-ts';
import {
    GetMembersSchema,
    AddMemberSchema,
    RemoveMemberSchema,
} from '../schemas/members.schema';

type GetMembersParams = FromSchema<typeof GetMembersSchema.params>;
type AddMemberParams = FromSchema<typeof AddMemberSchema.params>;
type AddMemberBody = FromSchema<typeof AddMemberSchema.body>;
type RemoveMemberParams = FromSchema<typeof RemoveMemberSchema.params>;

export async function getMembersHandler(
    request: FastifyRequest<{ Params: GetMembersParams }>,
    reply: FastifyReply
) {
    try {
        const { siteId } = request.params;

        const siteCheck = await request.server.pg.query('SELECT id FROM sites WHERE id = $1', [siteId]);
        if (siteCheck.rowCount === 0) {
            return reply.code(404).send({ message: 'Site not found' });
        }

        const result = await request.server.pg.query(
            `SELECT user_id, site_id, joined_at
             FROM site_members
             WHERE site_id = $1
             ORDER BY joined_at DESC`,
            [siteId]
        );

        const items = result.rows.map((r: any) => ({
            userId: r.user_id,
            siteId: r.site_id,
            joinedAt: r.joined_at,
        }));

        return reply.code(200).send({
            items,
            totalCount: items.length,
            message: 'Members retrieved successfully',
        });
    } catch (error) {
        request.log.error(error, 'Error fetching members');
        return reply.code(500).send({ message: 'Internal Server Error' });
    }
}

export async function addMemberHandler(
    request: FastifyRequest<{ Params: AddMemberParams; Body: AddMemberBody }>,
    reply: FastifyReply
) {
    try {
        const { siteId } = request.params;
        const { userId } = request.body;
        const actorUserId = request.headers['x-user-id'] as string | undefined;

        const siteCheck = await request.server.pg.query('SELECT id FROM sites WHERE id = $1', [siteId]);
        if (siteCheck.rowCount === 0) {
            return reply.code(404).send({ message: 'Site not found' });
        }

        const existing = await request.server.pg.query(
            'SELECT 1 FROM site_members WHERE user_id = $1 AND site_id = $2',
            [userId, siteId]
        );
        if ((existing.rowCount ?? 0) > 0) {
            return reply.code(409).send({ message: 'User is already a member of this site' });
        }

        await request.server.pg.query(
            `INSERT INTO site_members (user_id, site_id) VALUES ($1, $2)`,
            [userId, siteId]
        );

        request.server.audit.log({
            action: 'site:add_member',
            resource: 'site',
            resourceId: siteId,
            userId: actorUserId,
            metadata: { targetUserId: userId },
        });

        return reply.code(201).send({ message: 'Member added successfully' });
    } catch (error) {
        request.log.error(error, 'Error adding member');
        return reply.code(500).send({ message: 'Internal Server Error' });
    }
}

export async function removeMemberHandler(
    request: FastifyRequest<{ Params: RemoveMemberParams }>,
    reply: FastifyReply
) {
    try {
        const { siteId, userId } = request.params;
        const actorUserId = request.headers['x-user-id'] as string | undefined;

        const result = await request.server.pg.query(
            `DELETE FROM site_members WHERE user_id = $1 AND site_id = $2 RETURNING user_id`,
            [userId, siteId]
        );

        if (result.rowCount === 0) {
            return reply.code(404).send({ message: 'Member not found in this site' });
        }

        request.server.audit.log({
            action: 'site:remove_member',
            resource: 'site',
            resourceId: siteId,
            userId: actorUserId,
            metadata: { targetUserId: userId },
        });

        return reply.code(200).send({ message: 'Member removed successfully' });
    } catch (error) {
        request.log.error(error, 'Error removing member');
        return reply.code(500).send({ message: 'Internal Server Error' });
    }
}
