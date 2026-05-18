import Fastify from 'fastify';
import { createLogger, createAuditLogger, postgresPlugin } from '@dynolab/core';
import redisPlugin from './plugins/redis.js';
import { authRoutes } from './routes/auth.routes.js';
import { verifyRoutes } from './routes/verify.routes.js';
import { usersRoutes } from './routes/users.routes.js';

const logger = createLogger({ service: 'auth-service' });

const app = Fastify({ logger });

// Plugins
app.register(postgresPlugin);
app.register(redisPlugin);

// Audit
const audit = createAuditLogger(logger);
app.decorate('audit', audit);

// Routes
app.register(authRoutes);
app.register(verifyRoutes);
app.register(usersRoutes);

// Health check
app.get('/health', async () => ({ status: 'ok' }));

// Start
const PORT = parseInt(process.env.PORT || '4001');

app.listen({ port: PORT, host: '0.0.0.0' }, (err, address) => {
    if (err) {
        logger.error(err, 'Failed to start server');
        process.exit(1);
    }
    logger.info(`Auth service listening on ${address}`);
});