import { FastifyPluginAsync } from 'fastify';
import {
    GetSitesSchema,
    GetSiteByIdSchema,
    CreateSiteSchema,
    UpdateSiteSchema,
    DeleteSiteSchema,
} from '../schemas/sites.schema';
import {
    getSitesHandler,
    getSiteByIdHandler,
    createSiteHandler,
    updateSiteHandler,
    deleteSiteHandler,
} from '../handlers/sites.handlers';

const sitesRoutes: FastifyPluginAsync = async (app) => {
    app.get('/sites', { schema: GetSitesSchema }, getSitesHandler);
    app.get('/sites/:id', { schema: GetSiteByIdSchema }, getSiteByIdHandler);
    app.post('/sites', { schema: CreateSiteSchema }, createSiteHandler);
    app.put('/sites/:id', { schema: UpdateSiteSchema }, updateSiteHandler);
    app.delete('/sites/:id', { schema: DeleteSiteSchema }, deleteSiteHandler);
};

export default sitesRoutes;
