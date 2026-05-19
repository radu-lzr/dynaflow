import { FastifyPluginAsync } from 'fastify';
import {
    GetUserTempPermissionsSchema,
    CreateTempPermissionSchema,
    RemoveTempPermissionByLinkedToSchema,
    RemoveTempPermissionByIdSchema,
} from '../schemas/temp-permissions.schema';
import {
    getUserTempPermissionsHandler,
    createTempPermissionHandler,
    removeTempPermissionByLinkedToHandler,
    removeTempPermissionByIdHandler,
} from '../handlers/temp-permissions.handlers';

const tempPermissionsRoutes: FastifyPluginAsync = async (app) => {
    app.get('/temp-permissions/:userId', { schema: GetUserTempPermissionsSchema }, getUserTempPermissionsHandler);
    app.post('/temp-permissions', { schema: CreateTempPermissionSchema }, createTempPermissionHandler);
    app.delete('/temp-permissions/by-link/:linkedTo', { schema: RemoveTempPermissionByLinkedToSchema }, removeTempPermissionByLinkedToHandler);
    app.delete('/temp-permissions/:id', { schema: RemoveTempPermissionByIdSchema }, removeTempPermissionByIdHandler);
};

export default tempPermissionsRoutes;
