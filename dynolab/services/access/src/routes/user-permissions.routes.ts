import { FastifyPluginAsync } from 'fastify';
import {
    GetUserPermissionsSchema,
    AssignPermissionsToUserSchema,
    RemovePermissionFromUserSchema,
} from '../schemas/user-permissions.schema';
import {
    getUserPermissionsHandler,
    assignPermissionToUserHandler,
    removePermissionFromUserHandler,
} from '../handlers/user-permissions.handlers';

const userPermissionsRoutes: FastifyPluginAsync = async (app) => {
    app.get('/user-permissions/:userId', { schema: GetUserPermissionsSchema }, getUserPermissionsHandler);
    app.post('/user-permissions', { schema: AssignPermissionsToUserSchema }, assignPermissionToUserHandler);
    app.delete('/user-permissions/:id', { schema: RemovePermissionFromUserSchema }, removePermissionFromUserHandler);
};

export default userPermissionsRoutes;
