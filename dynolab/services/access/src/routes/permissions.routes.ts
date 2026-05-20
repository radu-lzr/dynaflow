import { FastifyPluginAsync } from 'fastify';
import {
    GetPermissionsSchema,
    CreatePermissionSchema,
    DeletePermissionSchema,
} from '../schemas/permissions.schema';
import {
    getPermissionsHandler,
    createPermissionHandler,
    deletePermissionHandler,
} from '../handlers/permissions.handlers';

const permissionsRoutes: FastifyPluginAsync = async (app) => {
    app.get('/permissions', { schema: GetPermissionsSchema }, getPermissionsHandler);
    app.post('/permissions', { schema: CreatePermissionSchema }, createPermissionHandler);
    app.delete('/permissions/:id', { schema: DeletePermissionSchema }, deletePermissionHandler);
};

export default permissionsRoutes;
