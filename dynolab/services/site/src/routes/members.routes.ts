import { FastifyPluginAsync } from 'fastify';
import {
    GetMembersSchema,
    AddMemberSchema,
    RemoveMemberSchema,
} from '../schemas/members.schema';
import {
    getMembersHandler,
    addMemberHandler,
    removeMemberHandler,
} from '../handlers/members.handlers';

const membersRoutes: FastifyPluginAsync = async (app) => {
    app.get('/sites/:siteId/members', { schema: GetMembersSchema }, getMembersHandler);
    app.post('/sites/:siteId/members', { schema: AddMemberSchema }, addMemberHandler);
    app.delete('/sites/:siteId/members/:userId', { schema: RemoveMemberSchema }, removeMemberHandler);
};

export default membersRoutes;
