import { FastifyPluginAsync } from 'fastify';
import {
    AddObdLogsSchema,
    GetObdLogsSchema,
    DeleteObdLogsSchema,
} from '../schemas/obd-logs.schema';
import {
    addObdLogsHandler,
    getObdLogsHandler,
    deleteObdLogsHandler,
} from '../handlers/obd-logs.handlers';

const obdLogsRoutes: FastifyPluginAsync = async (app) => {
    app.post('/bench-sessions/:sessionId/obd-logs', { schema: AddObdLogsSchema }, addObdLogsHandler);
    app.get('/bench-sessions/:sessionId/obd-logs', { schema: GetObdLogsSchema }, getObdLogsHandler);
    app.delete('/bench-sessions/:sessionId/obd-logs', { schema: DeleteObdLogsSchema }, deleteObdLogsHandler);
};

export default obdLogsRoutes;
