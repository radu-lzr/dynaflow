import type { Db, MongoClient } from 'mongodb';
import type { AuditLogger } from '@dynolab/core';

declare module 'fastify' {
    interface FastifyInstance {
        mongo: Db;
        mongoClient: MongoClient;
        audit: AuditLogger;
    }
}
