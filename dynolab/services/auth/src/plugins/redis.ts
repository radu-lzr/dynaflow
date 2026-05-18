import { Redis } from 'ioredis';
import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';

declare module 'fastify' {
    export interface FastifyInstance {
        redis: Redis;
    }
};

export default fp(async (fastify: FastifyInstance) => {
    const redis = new Redis({
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
    });
    
    await redis.ping(); // Test connection
    fastify.decorate('redis', redis);

    fastify.addHook('onClose', async () => {
        await redis.quit();
    });
});