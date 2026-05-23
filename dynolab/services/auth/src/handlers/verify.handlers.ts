import { FastifyRequest, FastifyReply } from 'fastify';
import { FromSchema } from 'json-schema-to-ts';
import { VerifyTokenSchema } from '../schemas/verify.schema';
import { verifyAccessToken } from '../utils/jwt';

type VerifyTokenHeaders = FromSchema<typeof VerifyTokenSchema.headers>;

export async function verifyTokenHandler(
    request: FastifyRequest<{ Headers: VerifyTokenHeaders }>,
    reply: FastifyReply
) {
    try {
        const authHeader = request.headers.authorization;

        if (!authHeader?.startsWith('Bearer ')) {
            return reply.code(401).send({ message: 'Unauthorized' });
        }

        const token = authHeader.slice(7);

        let payload: ReturnType<typeof verifyAccessToken>;
        try {
            payload = verifyAccessToken(token);
        } catch {
            return reply.code(401).send({ message: 'Unauthorized' });
        }

        const blacklisted = await request.server.redis.get(`blacklist:${payload.jti}`);
        if (blacklisted) {
            return reply.code(401).send({ message: 'Unauthorized' });
        }

        reply.header('X-User-Id', payload.userId);
        reply.header('X-Account-Type', payload.accountType);
        return reply.code(200).send({
            userId: payload.userId,
            accountType: payload.accountType,
            message: 'Token valid'
        });

    } catch (error) {
        request.log.error(error, 'Token verification failed');
        return reply.code(500).send({ message: 'Internal Server Error' });
    }
}
