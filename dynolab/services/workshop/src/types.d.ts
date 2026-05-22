import type { Pool, AuditLogger } from '@dynolab/core';
import type { Channel } from 'amqplib';

declare module 'fastify' {
    interface FastifyInstance {
        pg: Pool;
        audit: AuditLogger;
        amqp: {
            channel: Channel;
            publish: (exchange: string, routingKey: string, payload: object) => void;
        };
    }
}
