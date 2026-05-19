import { FastifyPluginAsync } from 'fastify';
import { VerifyTokenSchema } from '../schemas/verify.schema';
import { verifyTokenHandler } from '../handlers/verify.handlers';

const verifyRoutes: FastifyPluginAsync = async (fastify) => {
    fastify.post('/auth/verify', { schema: VerifyTokenSchema }, verifyTokenHandler);
};

export default verifyRoutes;
