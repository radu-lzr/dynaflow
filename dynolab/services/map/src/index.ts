import Fastify from 'fastify';
import multipart from '@fastify/multipart';
import { getLoggerOptions, createAuditLogger, postgresPlugin } from '@dynolab/core';
import dbPlugin from './plugins/db';
import minioPlugin from './plugins/minio';
import mapsRoutes from './routes/maps.routes';
import versionsRoutes from './routes/versions.routes';
import configsRoutes from './routes/configs.routes';

const app = Fastify({ logger: getLoggerOptions({ service: 'map-service' }) });

app.register(multipart, { limits: { fileSize: 50 * 1024 * 1024 } });
app.register(postgresPlugin);
app.register(dbPlugin);
app.register(minioPlugin);

const audit = createAuditLogger(app.log);
app.decorate('audit', audit);

app.register(mapsRoutes);
app.register(versionsRoutes);
app.register(configsRoutes);

app.get('/health', async () => ({ status: 'ok' }));

const PORT = parseInt(process.env.PORT || '4006');

app.listen({ port: PORT, host: '0.0.0.0' }, (err, address) => {
    if (err) {
        app.log.error(err, 'Failed to start server');
        process.exit(1);
    }
    app.log.info(`Map service listening on ${address}`);
});
