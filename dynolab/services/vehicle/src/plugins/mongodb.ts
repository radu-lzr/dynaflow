import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import { MongoClient } from 'mongodb';

export default fp(async (fastify: FastifyInstance) => {
    const uri = process.env.MONGO_URI;
    if (!uri) {
        throw new Error('MONGO_URI environment variable is required');
    }

    const client = new MongoClient(uri);
    await client.connect();

    const db = client.db();

    await db.collection('vehicles').createIndex({ brand: 1, model: 1 });
    await db.collection('vehicles').createIndex({ engineCode: 1 });
    await db.collection('vehicles').createIndex({ ecuType: 1 });
    await db.collection('vehicles').createIndex({ tags: 1 });
    await db.collection('vehicles').createIndex({ fuelType: 1 });

    fastify.decorate('mongo', db);
    fastify.decorate('mongoClient', client);

    fastify.addHook('onClose', async () => {
        await client.close();
    });

    fastify.log.info('MongoDB connected and indexes ensured');
});
