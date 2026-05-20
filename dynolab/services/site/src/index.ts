import Fastify from 'fastify';
import { getLoggerOptions, createAuditLogger, postgresPlugin } from '@dynolab/core';
import dbPlugin from './plugins/db';
import sitesRoutes from './routes/sites.routes';
import equipmentRoutes from './routes/equipment.routes';
import membersRoutes from './routes/members.routes';

const app = Fastify({ logger: getLoggerOptions({ service: 'site-service' }) });

// Plugins
app.register(postgresPlugin);
app.register(dbPlugin);

// Audit
const audit = createAuditLogger(app.log);
app.decorate('audit', audit);

// Routes
app.register(sitesRoutes);
app.register(equipmentRoutes);
app.register(membersRoutes);

// Health check
app.get('/health', async () => ({ status: 'ok' }));

// Start
const PORT = parseInt(process.env.PORT || '4003');

app.listen({ port: PORT, host: '0.0.0.0' }, (err, address) => {
    if (err) {
        app.log.error(err, 'Failed to start server');
        process.exit(1);
    }
    app.log.info(`Site service listening on ${address}`);
});
