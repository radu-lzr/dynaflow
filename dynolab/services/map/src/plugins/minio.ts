import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import { S3Client, CreateBucketCommand, HeadBucketCommand } from '@aws-sdk/client-s3';

export default fp(async (fastify: FastifyInstance) => {
    const client = new S3Client({
        endpoint: process.env.MINIO_ENDPOINT || 'http://localhost:9000',
        region: 'us-east-1',
        credentials: {
            accessKeyId: process.env.MINIO_ACCESS_KEY || 'dynolab',
            secretAccessKey: process.env.MINIO_SECRET_KEY || 'dynolab_dev',
        },
        forcePathStyle: true,
    });

    const bucket = process.env.MINIO_BUCKET || 'dynolab-maps';

    try {
        await client.send(new HeadBucketCommand({ Bucket: bucket }));
    } catch {
        await client.send(new CreateBucketCommand({ Bucket: bucket }));
    }

    fastify.decorate('minio', client);

    fastify.addHook('onClose', async () => {
        client.destroy();
    });
});
