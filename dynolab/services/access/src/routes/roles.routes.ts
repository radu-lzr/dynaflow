import { FastifyPluginAsync } from 'fastify';
import {
    GetRolesSchema,
    GetRoleByIdSchema,
    CreateRoleSchema,
    EditRoleSchema,
    DeleteRoleSchema,
    AssignPermissionsToRoleSchema,
    RemovePermissionsFromRoleSchema,
} from '../schemas/roles.schema';
import {
    getRolesHandler,
    getRoleByIdHandler,
    createRoleHandler,
    editRoleHandler,
    deleteRoleHandler,
    assignPermissionsToRoleHandler,
    removePermissionsFromRoleHandler,
} from '../handlers/roles.handlers';

const rolesRoutes: FastifyPluginAsync = async (app) => {
    app.get('/roles', { schema: GetRolesSchema }, getRolesHandler);
    app.get('/roles/:id', { schema: GetRoleByIdSchema }, getRoleByIdHandler);
    app.post('/roles', { schema: CreateRoleSchema }, createRoleHandler);
    app.put('/roles/:id', { schema: EditRoleSchema }, editRoleHandler);
    app.delete('/roles/:id', { schema: DeleteRoleSchema }, deleteRoleHandler);
    app.post('/roles/:id/permissions', { schema: AssignPermissionsToRoleSchema }, assignPermissionsToRoleHandler);
    app.delete('/roles/:id/permissions', { schema: RemovePermissionsFromRoleSchema }, removePermissionsFromRoleHandler);
};

export default rolesRoutes;
