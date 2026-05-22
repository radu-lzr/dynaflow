import { FastifyPluginAsync } from 'fastify';
import {
    GetInterventionsSchema,
    GetInterventionByIdSchema,
    CreateInterventionSchema,
    UpdateInterventionSchema,
    DeleteInterventionSchema,
    StartInterventionSchema,
    CompleteInterventionSchema,
    DeliverInterventionSchema,
    AssignTechnicianSchema,
    CreateBenchSessionProxySchema,
} from '../schemas/interventions.schema';
import {
    getInterventionsHandler,
    getInterventionByIdHandler,
    createInterventionHandler,
    updateInterventionHandler,
    deleteInterventionHandler,
    startInterventionHandler,
    completeInterventionHandler,
    deliverInterventionHandler,
    assignTechnicianHandler,
    createBenchSessionProxyHandler,
} from '../handlers/interventions.handlers';

const interventionsRoutes: FastifyPluginAsync = async (app) => {
    // Lifecycle + action routes BEFORE generic /:id routes
    app.put('/interventions/:id/start', { schema: StartInterventionSchema }, startInterventionHandler);
    app.put('/interventions/:id/complete', { schema: CompleteInterventionSchema }, completeInterventionHandler);
    app.put('/interventions/:id/deliver', { schema: DeliverInterventionSchema }, deliverInterventionHandler);
    app.put('/interventions/:id/assign', { schema: AssignTechnicianSchema }, assignTechnicianHandler);
    app.post('/interventions/:id/bench-session', { schema: CreateBenchSessionProxySchema }, createBenchSessionProxyHandler);

    // Generic CRUD routes
    app.get('/interventions', { schema: GetInterventionsSchema }, getInterventionsHandler);
    app.post('/interventions', { schema: CreateInterventionSchema }, createInterventionHandler);
    app.get('/interventions/:id', { schema: GetInterventionByIdSchema }, getInterventionByIdHandler);
    app.put('/interventions/:id', { schema: UpdateInterventionSchema }, updateInterventionHandler);
    app.delete('/interventions/:id', { schema: DeleteInterventionSchema }, deleteInterventionHandler);
};

export default interventionsRoutes;
