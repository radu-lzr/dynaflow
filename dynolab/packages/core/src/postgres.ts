import { Pool } from 'pg';
import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';

declare module 'fastify' {
    export interface FastifyInstance {
        pg: Pool;
    }
};
export default fp(async (fastify: FastifyInstance) => {
    const pool = new Pool({
        host: process.env.POSTGRES_HOST,
        port: parseInt(process.env.POSTGRES_PORT || '5432'),
        user: process.env.POSTGRES_USER,
        password: process.env.POSTGRES_PASSWORD,
        database: process.env.POSTGRES_DB,
    });

    await pool.query(`SELECT 1`); // Test connection

    fastify.decorate('pg', pool);
    fastify.addHook('onClose', async () => {
        await pool.end();
    });
});

