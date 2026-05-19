import Fastify from 'fastify';
import { getLoggerOptions, createAuditLogger, postgresPlugin } from '@dynolab/core';


const app = Fastify({ logger: getLoggerOptions({ service: 'auth-service' }) });

// Plugins
app.register(postgresPlugin);

// Audit
const audit = createAuditLogger(app.log);
app.decorate('audit', audit);

// Routes
//TODO

// Health check
app.get('/health', async () => ({ status: 'ok' }));

// Start
const PORT = parseInt(process.env.PORT || '4001');

app.listen({ port: PORT, host: '0.0.0.0' }, (err, address) => {
    if (err) {
        app.log.error(err, 'Failed to start server');
        process.exit(1);
    }
    app.log.info(`Auth service listening on ${address}`);
});