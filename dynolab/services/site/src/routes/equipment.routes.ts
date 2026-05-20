import { FastifyPluginAsync } from 'fastify';
import {
    GetEquipmentSchema,
    CreateEquipmentSchema,
    UpdateEquipmentSchema,
    DeleteEquipmentSchema,
} from '../schemas/equipment.schema';
import {
    getEquipmentHandler,
    createEquipmentHandler,
    updateEquipmentHandler,
    deleteEquipmentHandler,
} from '../handlers/equipment.handlers';

const equipmentRoutes: FastifyPluginAsync = async (app) => {
    app.get('/sites/:siteId/equipment', { schema: GetEquipmentSchema }, getEquipmentHandler);
    app.post('/sites/:siteId/equipment', { schema: CreateEquipmentSchema }, createEquipmentHandler);
    app.put('/sites/:siteId/equipment/:id', { schema: UpdateEquipmentSchema }, updateEquipmentHandler);
    app.delete('/sites/:siteId/equipment/:id', { schema: DeleteEquipmentSchema }, deleteEquipmentHandler);
};

export default equipmentRoutes;
