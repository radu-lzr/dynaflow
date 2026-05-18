import type { FastifyInstance } from 'fastify';
import { VerifyTokenSchema } from '../schemas/verify.schema';
import { verifyTokenHandler } from '../handlers/verify.handlers';

export async function verifyRoutes(fastify: FastifyInstance) {
    fastify.post('/auth/verify', { schema: VerifyTokenSchema }, verifyTokenHandler);
}
