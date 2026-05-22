import { FastifyPluginAsync } from 'fastify';
import {
    AddDatapointsSchema,
    GetDatapointsSchema,
    DeleteDatapointsSchema,
} from '../schemas/datapoints.schema';
import {
    addDatapointsHandler,
    getDatapointsHandler,
    deleteDatapointsHandler,
} from '../handlers/datapoints.handlers';

const datapointsRoutes: FastifyPluginAsync = async (app) => {
    app.post('/bench-sessions/:sessionId/datapoints', { schema: AddDatapointsSchema }, addDatapointsHandler);
    app.get('/bench-sessions/:sessionId/datapoints', { schema: GetDatapointsSchema }, getDatapointsHandler);
    app.delete('/bench-sessions/:sessionId/datapoints', { schema: DeleteDatapointsSchema }, deleteDatapointsHandler);
};

export default datapointsRoutes;
