import Fastify from 'fastify';
import { getLoggerOptions, createAuditLogger, postgresPlugin } from '@dynolab/core';
import dbPlugin from './plugins/db';
import clientVehiclesRoutes from './routes/client-vehicles.routes';
import modificationsRoutes from './routes/modifications.routes';

const app = Fastify({ logger: getLoggerOptions({ service: 'client-vehicle-service' }) });

// Plugins
app.register(postgresPlugin);
app.register(dbPlugin);

// Audit
const audit = createAuditLogger(app.log);
app.decorate('audit', audit);

// Routes
app.register(clientVehiclesRoutes);
app.register(modificationsRoutes);

// Health check
app.get('/health', async () => ({ status: 'ok' }));

// Start
const PORT = parseInt(process.env.PORT || '4005');

app.listen({ port: PORT, host: '0.0.0.0' }, (err, address) => {
    if (err) {
        app.log.error(err, 'Failed to start server');
        process.exit(1);
    }
    app.log.info(`Client Vehicle service listening on ${address}`);
});
