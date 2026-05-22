import Fastify from 'fastify';
import { getLoggerOptions, createAuditLogger, postgresPlugin } from '@dynolab/core';
import dbPlugin from './plugins/db';
import benchSessionsRoutes from './routes/bench-sessions.routes';
import datapointsRoutes from './routes/datapoints.routes';
import obdLogsRoutes from './routes/obd-logs.routes';

const app = Fastify({ logger: getLoggerOptions({ service: 'telemetry-service' }) });

// Plugins
app.register(postgresPlugin);
app.register(dbPlugin);

// Audit
const audit = createAuditLogger(app.log);
app.decorate('audit', audit);

// Routes
app.register(benchSessionsRoutes);
app.register(datapointsRoutes);
app.register(obdLogsRoutes);

// Health check
app.get('/health', async () => ({ status: 'ok' }));

// Start
const PORT = parseInt(process.env.PORT || '4008');

app.listen({ port: PORT, host: '0.0.0.0' }, (err, address) => {
    if (err) {
        app.log.error(err, 'Failed to start server');
        process.exit(1);
    }
    app.log.info(`Telemetry service listening on ${address}`);
});
