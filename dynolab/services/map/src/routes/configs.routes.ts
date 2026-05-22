import { FastifyPluginAsync } from 'fastify';
import {
    GetConfigsSchema,
    AddConfigSchema,
    RemoveConfigSchema,
} from '../schemas/configs.schema';
import {
    getConfigsHandler,
    addConfigHandler,
    removeConfigHandler,
} from '../handlers/configs.handlers';

const configsRoutes: FastifyPluginAsync = async (app) => {
    app.get('/maps/:id/configs', { schema: GetConfigsSchema }, getConfigsHandler);
    app.post('/maps/:id/configs', { schema: AddConfigSchema }, addConfigHandler);
    app.delete('/maps/:id/configs/:configId', { schema: RemoveConfigSchema }, removeConfigHandler);
};

export default configsRoutes;
