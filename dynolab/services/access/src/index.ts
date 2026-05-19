import Fastify from 'fastify';
import { getLoggerOptions, createAuditLogger, postgresPlugin } from '@dynolab/core';
import checkRoutes from './routes/check.routes';
import rolesRoutes from './routes/roles.routes';
import permissionsRoutes from './routes/permissions.routes';
import userRolesRoutes from './routes/user-roles.routes';
import userPermissionsRoutes from './routes/user-permissions.routes';
import tempPermissionsRoutes from './routes/temp-permissions.routes';

const app = Fastify({ logger: getLoggerOptions({ service: 'auth-service' }) });

// Plugins
app.register(postgresPlugin);

// Audit
const audit = createAuditLogger(app.log);
app.decorate('audit', audit);

// Routes
app.register(checkRoutes);
app.register(rolesRoutes);
app.register(permissionsRoutes);
app.register(userRolesRoutes);
app.register(userPermissionsRoutes);
app.register(tempPermissionsRoutes);

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