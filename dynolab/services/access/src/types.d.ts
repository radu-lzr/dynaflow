import type { Pool, AuditLogger } from '@dynolab/core';

declare module 'fastify' {
    interface FastifyInstance {
        pg: Pool;
        audit: AuditLogger;
    }
}