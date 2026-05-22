import { FastifyRequest, FastifyReply } from 'fastify';
import { FromSchema } from 'json-schema-to-ts';
import crypto from 'crypto';
import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import {
    GetVersionsSchema,
    UploadVersionSchema,
    DownloadVersionSchema,
    DeleteVersionSchema,
} from '../schemas/versions.schema';

type GetVersionsParams = FromSchema<typeof GetVersionsSchema.params>;
type UploadVersionParams = FromSchema<typeof UploadVersionSchema.params>;
type DownloadVersionParams = FromSchema<typeof DownloadVersionSchema.params>;
type DeleteVersionParams = FromSchema<typeof DeleteVersionSchema.params>;

export async function getVersionsHandler(
    request: FastifyRequest<{ Params: GetVersionsParams }>,
    reply: FastifyReply
) {
    try {
        const { id } = request.params;

        const mapResult = await request.server.pg.query(
            `SELECT id FROM maps WHERE id = $1`,
            [id]
        );

        if (mapResult.rowCount === 0) {
            return reply.code(404).send({ message: 'Map not found' });
        }

        const result = await request.server.pg.query(
            `SELECT id, map_id, version_number, changelog, file_ref, file_hash, file_size, author_id, created_at
             FROM map_versions WHERE map_id = $1 ORDER BY created_at DESC`,
            [id]
        );

        const versions = result.rows.map((v: any) => ({
            id: v.id,
            mapId: v.map_id,
            versionNumber: v.version_number,
            changelog: v.changelog,
            fileRef: v.file_ref,
            fileHash: v.file_hash,
            fileSize: parseInt(v.file_size, 10),
            authorId: v.author_id,
            createdAt: v.created_at,
        }));

        return reply.code(200).send({ versions, message: 'Versions retrieved successfully' });
    } catch (error) {
        request.log.error(error, 'Error fetching versions');
        return reply.code(500).send({ message: 'Internal Server Error' });
    }
}

export async function uploadVersionHandler(
    request: FastifyRequest<{ Params: UploadVersionParams }>,
    reply: FastifyReply
) {
    try {
        const { id: mapId } = request.params;
        const actorUserId = request.headers['x-user-id'] as string | undefined;

        const mapResult = await request.server.pg.query(
            `SELECT id FROM maps WHERE id = $1`,
            [mapId]
        );

        if (mapResult.rowCount === 0) {
            return reply.code(404).send({ message: 'Map not found' });
        }

        const data = await request.file();
        if (!data) {
            return reply.code(400).send({ message: 'No file uploaded' });
        }

        const fields = data.fields as Record<string, any>;
        const versionNumber = fields.versionNumber?.value as string | undefined;
        const changelog = fields.changelog?.value as string | undefined;

        if (!versionNumber) {
            return reply.code(400).send({ message: 'versionNumber is required' });
        }

        const existing = await request.server.pg.query(
            `SELECT id FROM map_versions WHERE map_id = $1 AND version_number = $2`,
            [mapId, versionNumber]
        );

        if ((existing.rowCount ?? 0) > 0) {
            return reply.code(409).send({ message: `Version '${versionNumber}' already exists for this map` });
        }

        const chunks: Buffer[] = [];
        for await (const chunk of data.file) {
            chunks.push(chunk);
        }
        const fileBuffer = Buffer.concat(chunks);

        const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
        const fileSize = fileBuffer.length;
        const fileKey = `maps/${mapId}/${versionNumber}.bin`;
        const bucket = process.env.MINIO_BUCKET || 'dynolab-maps';

        await request.server.minio.send(new PutObjectCommand({
            Bucket: bucket,
            Key: fileKey,
            Body: fileBuffer,
        }));

        const result = await request.server.pg.query(
            `INSERT INTO map_versions (map_id, version_number, changelog, file_ref, file_hash, file_size, author_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING id`,
            [mapId, versionNumber, changelog ?? null, fileKey, fileHash, fileSize, actorUserId ?? '00000000-0000-0000-0000-000000000000']
        );

        const versionId = result.rows[0].id;

        request.server.audit.log({
            action: 'map_version:create',
            resource: 'map_version',
            resourceId: versionId,
            userId: actorUserId,
            sensitive: true,
            metadata: { mapId, versionNumber, fileHash, fileSize },
        });

        return reply.code(201).send({
            id: versionId,
            versionNumber,
            fileHash,
            fileSize,
            message: 'Version uploaded successfully',
        });
    } catch (error) {
        request.log.error(error, 'Error uploading version');
        return reply.code(500).send({ message: 'Internal Server Error' });
    }
}

export async function downloadVersionHandler(
    request: FastifyRequest<{ Params: DownloadVersionParams }>,
    reply: FastifyReply
) {
    try {
        const { id: mapId, versionId } = request.params;
        const actorUserId = request.headers['x-user-id'] as string | undefined;

        const result = await request.server.pg.query(
            `SELECT id, version_number, file_ref, file_hash, file_size
             FROM map_versions WHERE id = $1 AND map_id = $2`,
            [versionId, mapId]
        );

        if (result.rowCount === 0) {
            return reply.code(404).send({ message: 'Version not found' });
        }

        const version = result.rows[0];
        const bucket = process.env.MINIO_BUCKET || 'dynolab-maps';

        const s3Response = await request.server.minio.send(new GetObjectCommand({
            Bucket: bucket,
            Key: version.file_ref,
        }));

        if (!s3Response.Body) {
            return reply.code(404).send({ message: 'File not found in storage' });
        }

        const chunks: Uint8Array[] = [];
        for await (const chunk of s3Response.Body as AsyncIterable<Uint8Array>) {
            chunks.push(chunk);
        }
        const fileBuffer = Buffer.concat(chunks);

        const computedHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
        if (computedHash !== version.file_hash) {
            request.log.error({ versionId, expected: version.file_hash, got: computedHash }, 'File integrity check failed');
            return reply.code(500).send({ message: 'File integrity check failed' });
        }

        request.server.audit.log({
            action: 'map_version:download',
            resource: 'map_version',
            resourceId: versionId,
            userId: actorUserId,
            sensitive: true,
            metadata: { mapId, versionNumber: version.version_number, fileHash: version.file_hash },
        });

        reply.header('Content-Type', 'application/octet-stream');
        reply.header('Content-Disposition', `attachment; filename="${mapId}_${version.version_number}.bin"`);
        reply.header('Content-Length', version.file_size);

        return reply.send(fileBuffer);
    } catch (error) {
        request.log.error(error, 'Error downloading version');
        return reply.code(500).send({ message: 'Internal Server Error' });
    }
}

export async function deleteVersionHandler(
    request: FastifyRequest<{ Params: DeleteVersionParams }>,
    reply: FastifyReply
) {
    try {
        const { id: mapId, versionId } = request.params;
        const actorUserId = request.headers['x-user-id'] as string | undefined;

        const result = await request.server.pg.query(
            `SELECT id, version_number, file_ref FROM map_versions WHERE id = $1 AND map_id = $2`,
            [versionId, mapId]
        );

        if (result.rowCount === 0) {
            return reply.code(404).send({ message: 'Version not found' });
        }

        const version = result.rows[0];
        const bucket = process.env.MINIO_BUCKET || 'dynolab-maps';

        try {
            await request.server.minio.send(new DeleteObjectCommand({
                Bucket: bucket,
                Key: version.file_ref,
            }));
        } catch (minioErr) {
            request.log.warn({ fileRef: version.file_ref, err: minioErr }, 'Failed to delete file from MinIO');
        }

        await request.server.pg.query(`DELETE FROM map_versions WHERE id = $1`, [versionId]);

        request.server.audit.log({
            action: 'map_version:delete',
            resource: 'map_version',
            resourceId: versionId,
            userId: actorUserId,
            sensitive: true,
            metadata: { mapId, versionNumber: version.version_number },
        });

        return reply.code(200).send({ message: 'Version deleted successfully' });
    } catch (error) {
        request.log.error(error, 'Error deleting version');
        return reply.code(500).send({ message: 'Internal Server Error' });
    }
}
