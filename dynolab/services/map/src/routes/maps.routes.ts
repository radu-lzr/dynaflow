import { FastifyPluginAsync } from 'fastify';
import {
    GetMapsSchema,
    GetMapByIdSchema,
    CreateMapSchema,
    UpdateMapSchema,
    DeleteMapSchema,
    DevelopMapSchema,
    ValidateMapSchema,
    RevokeMapSchema,
    RedevelopMapSchema,
} from '../schemas/maps.schema';
import {
    getMapsHandler,
    getMapByIdHandler,
    createMapHandler,
    updateMapHandler,
    deleteMapHandler,
    developMapHandler,
    validateMapHandler,
    revokeMapHandler,
    redevelopMapHandler,
} from '../handlers/maps.handlers';

const mapsRoutes: FastifyPluginAsync = async (app) => {
    app.get('/maps', { schema: GetMapsSchema }, getMapsHandler);
    app.get('/maps/:id', { schema: GetMapByIdSchema }, getMapByIdHandler);
    app.post('/maps', { schema: CreateMapSchema }, createMapHandler);
    app.put('/maps/:id', { schema: UpdateMapSchema }, updateMapHandler);
    app.delete('/maps/:id', { schema: DeleteMapSchema }, deleteMapHandler);

    app.put('/maps/:id/develop', { schema: DevelopMapSchema }, developMapHandler);
    app.put('/maps/:id/validate', { schema: ValidateMapSchema }, validateMapHandler);
    app.put('/maps/:id/revoke', { schema: RevokeMapSchema }, revokeMapHandler);
    app.put('/maps/:id/redevelop', { schema: RedevelopMapSchema }, redevelopMapHandler);
};

export default mapsRoutes;
