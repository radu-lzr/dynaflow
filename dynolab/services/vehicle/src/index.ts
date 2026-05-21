import Fastify from 'fastify';
import { getLoggerOptions, createAuditLogger } from '@dynolab/core';
import mongodbPlugin from './plugins/mongodb';
import vehiclesRoutes from './routes/vehicles.routes';

const app = Fastify({ logger: getLoggerOptions({ service: 'vehicle-service' }) });

app.register(mongodbPlugin);

const audit = createAuditLogger(app.log);
app.decorate('audit', audit);

app.register(vehiclesRoutes);

app.get('/health', async () => ({ status: 'ok' }));

const PORT = parseInt(process.env.PORT || '4004');

app.listen({ port: PORT, host: '0.0.0.0' }, (err, address) => {
    if (err) {
        app.log.error(err, 'Failed to start server');
        process.exit(1);
    }
    app.log.info(`Vehicle service listening on ${address}`);
});
