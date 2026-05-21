import { FastifyPluginAsync } from 'fastify';
import {
    CreateBenchSessionSchema,
    GetBenchSessionsSchema,
    CompareBenchSessionsSchema,
    GetBenchSessionByIdSchema,
    UpdateBenchSessionSchema,
    DeleteBenchSessionSchema,
} from '../schemas/bench-sessions.schema';
import {
    createBenchSessionHandler,
    getBenchSessionsHandler,
    compareBenchSessionsHandler,
    getBenchSessionByIdHandler,
    updateBenchSessionHandler,
    deleteBenchSessionHandler,
} from '../handlers/bench-sessions.handlers';

const benchSessionsRoutes: FastifyPluginAsync = async (app) => {
    app.post('/bench-sessions', { schema: CreateBenchSessionSchema }, createBenchSessionHandler);
    app.get('/bench-sessions', { schema: GetBenchSessionsSchema }, getBenchSessionsHandler);
    // compare MUST be registered before /:id to avoid Fastify treating "compare" as a param
    app.get('/bench-sessions/compare', { schema: CompareBenchSessionsSchema }, compareBenchSessionsHandler);
    app.get('/bench-sessions/:id', { schema: GetBenchSessionByIdSchema }, getBenchSessionByIdHandler);
    app.put('/bench-sessions/:id', { schema: UpdateBenchSessionSchema }, updateBenchSessionHandler);
    app.delete('/bench-sessions/:id', { schema: DeleteBenchSessionSchema }, deleteBenchSessionHandler);
};

export default benchSessionsRoutes;
