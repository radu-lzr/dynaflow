import { FastifyPluginAsync } from 'fastify';
import {
    GetClientVehiclesSchema,
    GetClientVehicleByIdSchema,
    CreateClientVehicleSchema,
    UpdateClientVehicleSchema,
    DeleteClientVehicleSchema,
} from '../schemas/client-vehicles.schema';
import {
    getClientVehiclesHandler,
    getClientVehicleByIdHandler,
    createClientVehicleHandler,
    updateClientVehicleHandler,
    deleteClientVehicleHandler,
} from '../handlers/client-vehicles.handlers';

const clientVehiclesRoutes: FastifyPluginAsync = async (app) => {
    app.get('/client-vehicles', { schema: GetClientVehiclesSchema }, getClientVehiclesHandler);
    app.get('/client-vehicles/:id', { schema: GetClientVehicleByIdSchema }, getClientVehicleByIdHandler);
    app.post('/client-vehicles', { schema: CreateClientVehicleSchema }, createClientVehicleHandler);
    app.put('/client-vehicles/:id', { schema: UpdateClientVehicleSchema }, updateClientVehicleHandler);
    app.delete('/client-vehicles/:id', { schema: DeleteClientVehicleSchema }, deleteClientVehicleHandler);
};

export default clientVehiclesRoutes;
