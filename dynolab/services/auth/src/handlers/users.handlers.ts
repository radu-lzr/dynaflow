import { FastifyRequest, FastifyReply } from 'fastify';
import { FromSchema } from 'json-schema-to-ts';
import {
    GetUsersSchema,
    GetUserByIdSchema,
    UpdateUserSchema,
    DeleteUserSchema
} from '../schemas/users.schema';

type GetUsersQuery = FromSchema<typeof GetUsersSchema.querystring>;
type GetUserByIdParams = FromSchema<typeof GetUserByIdSchema.params>;
type UpdateUserParams = FromSchema<typeof UpdateUserSchema.params>;
type UpdateUserBody = FromSchema<typeof UpdateUserSchema.body>;
type DeleteUserParams = FromSchema<typeof DeleteUserSchema.params>;

export async function getUsersHandler(
    request: FastifyRequest<{ Querystring: GetUsersQuery }>,
    reply: FastifyReply
) {
    try {
        const { page = 1, limit = 20, search, accountType, isActive } = request.query;
        const offset = (page - 1) * limit;

        const conditions: string[] = [];
        const params: unknown[] = [];

        if (search) {
            params.push(`%${search}%`);
            const i = params.length;
            conditions.push(`(email ILIKE $${i} OR first_name ILIKE $${i} OR last_name ILIKE $${i})`);
        }

        if (accountType !== undefined) {
            params.push(accountType);
            conditions.push(`account_type = $${params.length}`);
        }

        if (isActive !== undefined) {
            params.push(isActive);
            conditions.push(`is_active = $${params.length}`);
        }

        const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        const countResult = await request.server.pg.query(
            `SELECT COUNT(*) FROM users ${where}`,
            params
        );

        const dataParams = [...params, limit, offset];
        const usersResult = await request.server.pg.query(
            `SELECT id, email, first_name, last_name, account_type, created_at, is_active
             FROM users ${where}
             ORDER BY created_at DESC
             LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
            dataParams
        );

        const users = usersResult.rows.map(row => ({
            id: row.id,
            email: row.email,
            firstName: row.first_name,
            lastName: row.last_name,
            accountType: row.account_type,
            createdAt: row.created_at,
            isActive: row.is_active,
        }));

        return reply.code(200).send({
            users,
            totalCount: parseInt(countResult.rows[0].count),
            page,
            limit,
            message: 'Users retrieved successfully'
        });

    } catch (error) {
        request.log.error(error, 'Get users failed');
        return reply.code(500).send({ message: 'Internal Server Error' });
    }
}

export async function getUserByIdHandler(
    request: FastifyRequest<{ Params: GetUserByIdParams }>,
    reply: FastifyReply
) {
    try {
        const { id } = request.params;

        const result = await request.server.pg.query(
            `SELECT id, email, first_name, last_name, account_type, created_at, updated_at,
                    is_active, mfa_enabled, last_login
             FROM users WHERE id = $1`,
            [id]
        );

        if (result.rowCount === 0) {
            return reply.code(404).send({ message: 'User not found' });
        }

        const row = result.rows[0];

        return reply.code(200).send({
            id: row.id,
            email: row.email,
            firstName: row.first_name,
            lastName: row.last_name,
            accountType: row.account_type,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            isActive: row.is_active,
            mfaEnabled: row.mfa_enabled,
            lastLogin: row.last_login,
            message: 'User retrieved successfully'
        });

    } catch (error) {
        request.log.error(error, 'Get user by id failed');
        return reply.code(500).send({ message: 'Internal Server Error' });
    }
}

export async function updateUserHandler(
    request: FastifyRequest<{ Params: UpdateUserParams; Body: UpdateUserBody }>,
    reply: FastifyReply
) {
    try {
        const { id } = request.params;
        const { firstName, lastName, phone, mfaEnabled } = request.body;

        const setClauses: string[] = [];
        const params: unknown[] = [];

        if (firstName !== undefined) {
            params.push(firstName);
            setClauses.push(`first_name = $${params.length}`);
        }
        if (lastName !== undefined) {
            params.push(lastName);
            setClauses.push(`last_name = $${params.length}`);
        }
        if (phone !== undefined) {
            params.push(phone);
            setClauses.push(`phone = $${params.length}`);
        }
        if (mfaEnabled !== undefined) {
            params.push(mfaEnabled);
            setClauses.push(`mfa_enabled = $${params.length}`);
        }

        if (setClauses.length === 0) {
            return reply.code(400).send({ message: 'No fields to update' });
        }

        setClauses.push(`updated_at = NOW()`);
        params.push(id);

        const result = await request.server.pg.query(
            `UPDATE users
             SET ${setClauses.join(', ')}
             WHERE id = $${params.length}
             RETURNING id, first_name, last_name, phone, mfa_enabled, updated_at`,
            params
        );

        if (result.rowCount === 0) {
            return reply.code(404).send({ message: 'User not found' });
        }

        const row = result.rows[0];

        request.server.audit.log({
            action: 'user:update',
            resource: 'user',
            resourceId: id,
            userId: request.headers['x-user-id'] as string,
        });

        return reply.code(200).send({
            id: row.id,
            firstName: row.first_name,
            lastName: row.last_name,
            phone: row.phone,
            mfaEnabled: row.mfa_enabled,
            updatedAt: row.updated_at,
            message: 'User updated successfully'
        });

    } catch (error) {
        request.log.error(error, 'Update user failed');
        return reply.code(500).send({ message: 'Internal Server Error' });
    }
}

export async function deleteUserHandler(
    request: FastifyRequest<{ Params: DeleteUserParams }>,
    reply: FastifyReply
) {
    try {
        const { id } = request.params;

        const result = await request.server.pg.query(
            `UPDATE users SET is_active = false, updated_at = NOW()
             WHERE id = $1 AND is_active = true
             RETURNING id`,
            [id]
        );

        if (result.rowCount === 0) {
            return reply.code(404).send({ message: 'User not found' });
        }

        request.server.audit.log({
            action: 'user:delete',
            resource: 'user',
            resourceId: id,
            userId: request.headers['x-user-id'] as string,
            sensitive: true,
        });

        return reply.code(200).send({ message: 'User deactivated successfully' });

    } catch (error) {
        request.log.error(error, 'Delete user failed');
        return reply.code(500).send({ message: 'Internal Server Error' });
    }
}
