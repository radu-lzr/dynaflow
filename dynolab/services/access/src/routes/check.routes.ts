import { FastifyPluginAsync } from 'fastify';
import { CheckAccessSchema } from '../schemas/check.schema';
import { checkAccessHandler } from '../handlers/check.handlers';

const checkRoutes: FastifyPluginAsync = async (app) => {
    app.post('/access/check', { schema: CheckAccessSchema }, checkAccessHandler);
};

export default checkRoutes;
