import { FastifyPluginAsync } from 'fastify';
import {
    GetModificationsSchema,
    CreateModificationSchema,
    UpdateModificationSchema,
    DeleteModificationSchema,
} from '../schemas/modifications.schema';
import {
    getModificationsHandler,
    createModificationHandler,
    updateModificationHandler,
    deleteModificationHandler,
} from '../handlers/modifications.handlers';

const modificationsRoutes: FastifyPluginAsync = async (app) => {
    app.get('/client-vehicles/:vehicleId/modifications', { schema: GetModificationsSchema }, getModificationsHandler);
    app.post('/client-vehicles/:vehicleId/modifications', { schema: CreateModificationSchema }, createModificationHandler);
    app.put('/client-vehicles/:vehicleId/modifications/:id', { schema: UpdateModificationSchema }, updateModificationHandler);
    app.delete('/client-vehicles/:vehicleId/modifications/:id', { schema: DeleteModificationSchema }, deleteModificationHandler);
};

export default modificationsRoutes;
