import { FastifyPluginAsync } from 'fastify';
import {
    GetUserRolesSchema,
    AssignRolesToUserSchema,
    RemoveRoleFromUserSchema,
} from '../schemas/user-roles.schema';
import {
    getUserRolesHandler,
    assignRoleToUserHandler,
    removeRoleFromUserHandler,
} from '../handlers/user-roles.handlers';

const userRolesRoutes: FastifyPluginAsync = async (app) => {
    app.get('/user-roles/:userId', { schema: GetUserRolesSchema }, getUserRolesHandler);
    app.post('/user-roles', { schema: AssignRolesToUserSchema }, assignRoleToUserHandler);
    app.delete('/user-roles', { schema: RemoveRoleFromUserSchema }, removeRoleFromUserHandler);
};

export default userRolesRoutes;
