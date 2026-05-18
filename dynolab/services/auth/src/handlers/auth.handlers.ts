import { FastifyRequest, FastifyReply } from 'fastify';
import { FromSchema } from "json-schema-to-ts";
import { RegisterUserSchema, LoginUserSchema, RefreshTokenSchema, LogoutUserSchema } from "../schemas/auth.schema";
import { hashPassword, verifyPassword } from "../utils/password";
import { generateAccessToken, verifyAccessToken } from "../utils/jwt";
import { generateRefreshToken, hashRefreshToken } from "../utils/tokens";


type RegisterUserBody = FromSchema<typeof RegisterUserSchema.body>;
type LoginUserBody = FromSchema<typeof LoginUserSchema.body>;
type RefreshTokenBody = FromSchema<typeof RefreshTokenSchema.body>;
type LogoutUserBody = FromSchema<typeof LogoutUserSchema.body>;


const JWT_ACCESS_TTL = parseInt(process.env.JWT_ACCESS_TTL || '900');
const MAX_LOGIN_ATTEMPTS = parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5');
const LOCK_DURATION_MINUTES = parseInt(process.env.LOCK_DURATION_MINUTES || '15');
const REFRESH_TOKEN_TTL_DAYS = parseInt(process.env.REFRESH_TOKEN_TTL_DAYS || '7');

export async function registerUserHandler(
    request: FastifyRequest<{ Body: RegisterUserBody }>,
    reply: FastifyReply
) {
    try {
        const { email, password, firstName, lastName, accountType, phone } = request.body;

        const existingUsers = await request.server.pg.query(
            'SELECT id FROM users WHERE email = $1', [email]
        );
        if (existingUsers.rowCount > 0) {
            request.log.warn({ email }, 'Registration attempt with existing email');
            return reply.code(409).send({ message: 'Email already in use' });
        }

        const hashedPassword = await hashPassword(password);

        const result = await request.server.pg.query(
            `INSERT INTO users (email, password_hash, first_name, last_name, account_type, phone)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id`,
            [email, hashedPassword, firstName, lastName, accountType, phone || null]
        );

        const userId = result.rows[0].id;

        request.server.audit.log({
            action: 'user:create',
            resource: 'user',
            resourceId: userId,
            userId: userId,
        });

        return reply.code(201).send({
            id: userId,
            message: 'User registered successfully'
        });

    } catch (error) {
        request.log.error(error, 'Registration failed');
        return reply.code(500).send({
            message: 'Internal Server Error'
        });
    }
}

export async function loginUserHandler(
    request: FastifyRequest<{ Body: LoginUserBody }>,
    reply: FastifyReply
) {
    try {
        const { email, password } = request.body;

        const result = await request.server.pg.query(
            'SELECT id, password_hash, account_type, is_active, locked_until, failed_attempts FROM users WHERE email = $1',
            [email]
        );

        if (result.rowCount === 0) {
            return reply.code(401).send({ message: 'Invalid email or password' });
        }

        const user = result.rows[0];

        if (!user.is_active) {
            return reply.code(401).send({ message: 'Invalid email or password' });
        }

        if (user.locked_until && new Date(user.locked_until) > new Date()) {
            return reply.code(423).send({ message: 'Account locked, try again later' });
        }

        const isPasswordValid = await verifyPassword(user.password_hash, password);

        if (!isPasswordValid) {
            const newAttempts = user.failed_attempts + 1;

            if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
                await request.server.pg.query(
                    `UPDATE users SET failed_attempts = $1, locked_until = NOW() + INTERVAL '${LOCK_DURATION_MINUTES} minutes' WHERE id = $2`,
                    [newAttempts, user.id]
                );

                request.server.audit.log({
                    action: 'user:locked',
                    resource: 'user',
                    resourceId: user.id,
                    userId: user.id,
                    metadata: { reason: 'too_many_failed_attempts', attempts: newAttempts },
                });
            } else {
                await request.server.pg.query(
                    'UPDATE users SET failed_attempts = $1 WHERE id = $2',
                    [newAttempts, user.id]
                );
            }

            return reply.code(401).send({ message: 'Invalid email or password' });
        }

        // Login successful — reset counters
        await request.server.pg.query(
            'UPDATE users SET failed_attempts = 0, locked_until = NULL, last_login = NOW() WHERE id = $1',
            [user.id]
        );

        const accessToken = generateAccessToken(user.id, user.account_type);
        const refreshToken = generateRefreshToken();
        const refreshHash = hashRefreshToken(refreshToken);

        await request.server.pg.query(
            `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
            VALUES ($1, $2, NOW() + INTERVAL '${REFRESH_TOKEN_TTL_DAYS} days')`,
            [user.id, refreshHash]
        );

        request.server.audit.log({
            action: 'user:login',
            resource: 'user',
            resourceId: user.id,
            userId: user.id,
        });

        return reply.code(200).send({
            accessToken,
            refreshToken,
            expiresIn: JWT_ACCESS_TTL,
            message: 'Login successful'
        });

    } catch (error) {
        request.log.error(error, 'Login failed');
        return reply.code(500).send({
            message: 'Internal Server Error'
        });
    }
}

export async function refreshTokenHandler(
    request: FastifyRequest<{ Body: RefreshTokenBody }>,
    reply: FastifyReply
) {
    try {
        const { refreshToken } = request.body;
        const tokenHash = hashRefreshToken(refreshToken);

        const result = await request.server.pg.query(
            `SELECT id, user_id, expires_at, revoked_at
             FROM refresh_tokens
             WHERE token_hash = $1`,
            [tokenHash]
        );

        // Not found → token already used or fabricated → theft
        if (result.rowCount === 0) {
            request.log.warn('Refresh token not found — possible reuse attempt');
            return reply.code(401).send({ message: 'Invalid or expired refresh token' });
        }

        const token = result.rows[0];

        // Expired → plain 401
        if (new Date(token.expires_at) <= new Date()) {
            return reply.code(401).send({ message: 'Invalid or expired refresh token' });
        }

        // Revoked → token was already consumed → theft detected → nuke all sessions
        if (token.revoked_at !== null) {
            await request.server.pg.query(
                `UPDATE refresh_tokens SET revoked_at = NOW()
                 WHERE user_id = $1 AND revoked_at IS NULL`,
                [token.user_id]
            );

            request.server.audit.log({
                action: 'user:token_theft_detected',
                resource: 'user',
                resourceId: token.user_id,
                userId: token.user_id,
                sensitive: true,
                metadata: { reason: 'refresh_token_reuse' },
            });

            return reply.code(401).send({ message: 'Invalid or expired refresh token' });
        }

        // Revoke the consumed token (rotation)
        await request.server.pg.query(
            `UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = $1`,
            [token.id]
        );

        const userResult = await request.server.pg.query(
            'SELECT account_type FROM users WHERE id = $1 AND is_active = true',
            [token.user_id]
        );

        if (userResult.rowCount === 0) {
            return reply.code(401).send({ message: 'Invalid or expired refresh token' });
        }

        const { account_type } = userResult.rows[0];
        const accessToken = generateAccessToken(token.user_id, account_type);
        const newRefreshToken = generateRefreshToken();
        const newRefreshHash = hashRefreshToken(newRefreshToken);

        await request.server.pg.query(
            `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
             VALUES ($1, $2, NOW() + INTERVAL '${REFRESH_TOKEN_TTL_DAYS} days')`,
            [token.user_id, newRefreshHash]
        );

        request.server.audit.log({
            action: 'user:token_refresh',
            resource: 'user',
            resourceId: token.user_id,
            userId: token.user_id,
        });

        return reply.code(200).send({
            accessToken,
            refreshToken: newRefreshToken,
            expiresIn: JWT_ACCESS_TTL,
            message: 'Token refreshed successfully'
        });

    } catch (error) {
        request.log.error(error, 'Token refresh failed');
        return reply.code(500).send({
            message: 'Internal Server Error'
        });
    }
};

export async function logoutUserHandler(
    request: FastifyRequest<{ Body: LogoutUserBody }>,
    reply: FastifyReply
) {
    try {
        const { refreshToken } = request.body;
        const authHeader = request.headers.authorization;

        // Blacklist the access token in Redis
        if (authHeader && authHeader.startsWith('Bearer ')) {
            try {
                const jwt = authHeader.slice(7);
                const decoded = verifyAccessToken(jwt);
                const remainingTTL = decoded.exp - Math.floor(Date.now() / 1000);

                if (remainingTTL > 0) {
                    await request.server.redis.set(
                        `blacklist:${decoded.jti}`,
                        '1',
                        'EX',
                        remainingTTL
                    );
                }
            } catch {
                // Token already expired or invalid — no need to blacklist
            }
        }

        // Revoke the refresh token
        const tokenHash = hashRefreshToken(refreshToken);

        const result = await request.server.pg.query(
            `SELECT id, user_id, revoked_at
             FROM refresh_tokens
             WHERE token_hash = $1 AND expires_at > NOW()`,
            [tokenHash]
        );

        if (result.rowCount === 0 || result.rows[0].revoked_at !== null) {
            return reply.code(401).send({ message: 'Invalid refresh token' });
        }

        const token = result.rows[0];

        await request.server.pg.query(
            `UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = $1`,
            [token.id]
        );

        request.server.audit.log({
            action: 'user:logout',
            resource: 'user',
            resourceId: token.user_id,
            userId: request.headers['x-user-id'] as string || token.user_id,
        });

        return reply.code(200).send({ message: 'Logged out successfully' });

    } catch (error) {
        request.log.error(error, 'Logout failed');
        return reply.code(500).send({
            message: 'Internal Server Error'
        });
    }
}