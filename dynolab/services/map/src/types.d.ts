import type { Pool, AuditLogger } from '@dynolab/core';
import type { S3Client } from '@aws-sdk/client-s3';

declare module 'fastify' {
    interface FastifyInstance {
        pg: Pool;
        audit: AuditLogger;
        minio: S3Client;
    }
}
