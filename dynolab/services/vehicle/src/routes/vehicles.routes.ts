import { FastifyPluginAsync } from 'fastify';
import {
    GetVehiclesSchema,
    GetVehicleByIdSchema,
    CreateVehicleSchema,
    UpdateVehicleSchema,
    DeleteVehicleSchema,
    GetTagsSchema,
} from '../schemas/vehicles.schema';
import {
    getVehiclesHandler,
    getVehicleByIdHandler,
    createVehicleHandler,
    updateVehicleHandler,
    deleteVehicleHandler,
    getTagsHandler,
} from '../handlers/vehicles.handlers';

const vehiclesRoutes: FastifyPluginAsync = async (app) => {
    // Static routes before parameterized ones
    app.get('/vehicles/tags', { schema: GetTagsSchema }, getTagsHandler);

    app.get('/vehicles', { schema: GetVehiclesSchema }, getVehiclesHandler);
    app.get('/vehicles/:id', { schema: GetVehicleByIdSchema }, getVehicleByIdHandler);
    app.post('/vehicles', { schema: CreateVehicleSchema }, createVehicleHandler);
    app.put('/vehicles/:id', { schema: UpdateVehicleSchema }, updateVehicleHandler);
    app.delete('/vehicles/:id', { schema: DeleteVehicleSchema }, deleteVehicleHandler);
};

export default vehiclesRoutes;
