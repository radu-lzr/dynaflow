import { FastifyPluginAsync } from 'fastify';
import { VerifyAccessSchema } from '../schemas/verify.schema';
import { verifyAccessHandler } from '../handlers/verify.handlers';

const verifyRoutes: FastifyPluginAsync = async (app) => {
    app.post('/access/verify', { schema: VerifyAccessSchema }, verifyAccessHandler);
};

export default verifyRoutes;
