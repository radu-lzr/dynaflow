import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import amqplib, { type ChannelModel, type Channel } from 'amqplib';

async function connectWithRetry(url: string, retries = 8, baseDelayMs = 3000): Promise<ChannelModel> {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            return await amqplib.connect(url);
        } catch (err) {
            if (attempt === retries) throw err;
            await new Promise(r => setTimeout(r, baseDelayMs * attempt));
        }
    }
    throw new Error('unreachable');
}

export default fp(async (fastify: FastifyInstance) => {
    const url = process.env.RABBITMQ_URL || 'amqp://dynolab:dynolab_dev@localhost:5672';

    const connection: ChannelModel = await connectWithRetry(url);
    const channel: Channel = await connection.createChannel();

    await channel.assertExchange('dynolab.events', 'topic', { durable: true });

    const amqp = {
        channel,
        publish(exchange: string, routingKey: string, payload: object) {
            channel.publish(
                exchange,
                routingKey,
                Buffer.from(JSON.stringify(payload)),
                { persistent: true, contentType: 'application/json' }
            );
        },
    };

    fastify.decorate('amqp', amqp);

    fastify.addHook('onClose', async () => {
        await channel.close();
        await connection.close();
    });
});
