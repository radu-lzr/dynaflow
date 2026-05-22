const versionItem = {
    type: 'object',
    properties: {
        id: { type: 'string', format: 'uuid' },
        mapId: { type: 'string', format: 'uuid' },
        versionNumber: { type: 'string' },
        changelog: { type: 'string', nullable: true },
        fileRef: { type: 'string' },
        fileHash: { type: 'string' },
        fileSize: { type: 'integer' },
        authorId: { type: 'string', format: 'uuid' },
        createdAt: { type: 'string', format: 'date-time' },
    },
} as const;

export const GetVersionsSchema = {
    params: {
        type: 'object',
        required: ['id'],
        properties: {
            id: { type: 'string', format: 'uuid' },
        },
    },
    response: {
        200: {
            type: 'object',
            properties: {
                versions: { type: 'array', items: versionItem },
                message: { type: 'string' },
            },
        },
        404: {
            type: 'object',
            properties: { message: { type: 'string' } },
        },
    },
} as const;

// No body schema for upload — multipart is handled at runtime
export const UploadVersionSchema = {
    params: {
        type: 'object',
        required: ['id'],
        properties: {
            id: { type: 'string', format: 'uuid' },
        },
    },
    response: {
        201: {
            type: 'object',
            properties: {
                id: { type: 'string', format: 'uuid' },
                versionNumber: { type: 'string' },
                fileHash: { type: 'string' },
                fileSize: { type: 'integer' },
                message: { type: 'string' },
            },
        },
        400: {
            type: 'object',
            properties: { message: { type: 'string' } },
        },
        404: {
            type: 'object',
            properties: { message: { type: 'string' } },
        },
        409: {
            type: 'object',
            properties: { message: { type: 'string' } },
        },
    },
} as const;

export const DownloadVersionSchema = {
    params: {
        type: 'object',
        required: ['id', 'versionId'],
        properties: {
            id: { type: 'string', format: 'uuid' },
            versionId: { type: 'string', format: 'uuid' },
        },
    },
} as const;

export const DeleteVersionSchema = {
    params: {
        type: 'object',
        required: ['id', 'versionId'],
        properties: {
            id: { type: 'string', format: 'uuid' },
            versionId: { type: 'string', format: 'uuid' },
        },
    },
    response: {
        200: {
            type: 'object',
            properties: { message: { type: 'string' } },
        },
        404: {
            type: 'object',
            properties: { message: { type: 'string' } },
        },
    },
} as const;
