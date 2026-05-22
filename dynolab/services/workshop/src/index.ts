import Fastify from 'fastify';
import { getLoggerOptions, createAuditLogger, postgresPlugin } from '@dynolab/core';
import rabbitmqPlugin from './plugins/rabbitmq';
import dbPlugin from './plugins/db';
import interventionsRoutes from './routes/interventions.routes';

const app = Fastify({ logger: getLoggerOptions({ service: 'workshop-service' }) });

app.register(postgresPlugin);
app.register(dbPlugin);
app.register(rabbitmqPlugin);

const audit = createAuditLogger(app.log);
app.decorate('audit', audit);

app.register(interventionsRoutes);

app.get('/health', async () => ({ status: 'ok' }));

const PORT = parseInt(process.env.PORT || '4007');

app.listen({ port: PORT, host: '0.0.0.0' }, (err, address) => {
    if (err) {
        app.log.error(err, 'Failed to start server');
        process.exit(1);
    }
    app.log.info(`Workshop service listening on ${address}`);
});
