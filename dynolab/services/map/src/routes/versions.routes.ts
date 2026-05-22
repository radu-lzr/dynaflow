import { FastifyPluginAsync } from 'fastify';
import {
    GetVersionsSchema,
    UploadVersionSchema,
    DownloadVersionSchema,
    DeleteVersionSchema,
} from '../schemas/versions.schema';
import {
    getVersionsHandler,
    uploadVersionHandler,
    downloadVersionHandler,
    deleteVersionHandler,
} from '../handlers/versions.handlers';

const versionsRoutes: FastifyPluginAsync = async (app) => {
    app.get('/maps/:id/versions', { schema: GetVersionsSchema }, getVersionsHandler);
    app.post('/maps/:id/versions', { schema: UploadVersionSchema }, uploadVersionHandler);
    app.get('/maps/:id/versions/:versionId/download', { schema: DownloadVersionSchema }, downloadVersionHandler);
    app.delete('/maps/:id/versions/:versionId', { schema: DeleteVersionSchema }, deleteVersionHandler);
};

export default versionsRoutes;
