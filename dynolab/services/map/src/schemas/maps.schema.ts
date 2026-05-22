const mapTypeEnum = ['stage1', 'stage2', 'e85', 'custom'] as const;
const mapStatusEnum = ['draft', 'in_development', 'validated', 'revoked'] as const;
const configIdPattern = '^[0-9a-fA-F]{24}$';

const mapItem = {
    type: 'object',
    properties: {
        id: { type: 'string', format: 'uuid' },
        name: { type: 'string' },
        configId: { type: 'string' },
        type: { type: 'string', enum: mapTypeEnum },
        status: { type: 'string', enum: mapStatusEnum },
        authorId: { type: 'string', format: 'uuid' },
        description: { type: 'string', nullable: true },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
    },
} as const;

export const GetMapsSchema = {
    querystring: {
        type: 'object',
        properties: {
            page: { type: 'integer', minimum: 1, default: 1 },
            limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
            search: { type: 'string' },
            configId: { type: 'string', pattern: configIdPattern },
            type: { type: 'string', enum: mapTypeEnum },
            status: { type: 'string', enum: mapStatusEnum },
            authorId: { type: 'string', format: 'uuid' },
        },
    },
    response: {
        200: {
            type: 'object',
            properties: {
                maps: { type: 'array', items: mapItem },
                totalCount: { type: 'integer' },
                page: { type: 'integer' },
                limit: { type: 'integer' },
                message: { type: 'string' },
            },
        },
    },
} as const;

const versionSummaryItem = {
    type: 'object',
    properties: {
        id: { type: 'string', format: 'uuid' },
        versionNumber: { type: 'string' },
        changelog: { type: 'string', nullable: true },
        fileSize: { type: 'integer' },
        fileHash: { type: 'string' },
        authorId: { type: 'string', format: 'uuid' },
        createdAt: { type: 'string', format: 'date-time' },
    },
} as const;

const configCompatItem = {
    type: 'object',
    properties: {
        configId: { type: 'string' },
        notes: { type: 'string', nullable: true },
    },
} as const;

export const GetMapByIdSchema = {
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
                id: { type: 'string', format: 'uuid' },
                name: { type: 'string' },
                configId: { type: 'string' },
                type: { type: 'string', enum: mapTypeEnum },
                status: { type: 'string', enum: mapStatusEnum },
                authorId: { type: 'string', format: 'uuid' },
                description: { type: 'string', nullable: true },
                createdAt: { type: 'string', format: 'date-time' },
                updatedAt: { type: 'string', format: 'date-time' },
                versions: { type: 'array', items: versionSummaryItem },
                compatibleConfigs: { type: 'array', items: configCompatItem },
                message: { type: 'string' },
            },
        },
        404: {
            type: 'object',
            properties: { message: { type: 'string' } },
        },
    },
} as const;

export const CreateMapSchema = {
    body: {
        type: 'object',
        required: ['name', 'configId', 'type', 'authorId'],
        properties: {
            name: { type: 'string', minLength: 1, maxLength: 255 },
            configId: { type: 'string', pattern: configIdPattern },
            type: { type: 'string', enum: mapTypeEnum },
            description: { type: 'string' },
            authorId: { type: 'string', format: 'uuid' },
        },
    },
    response: {
        201: {
            type: 'object',
            properties: {
                id: { type: 'string', format: 'uuid' },
                message: { type: 'string' },
            },
        },
    },
} as const;

export const UpdateMapSchema = {
    params: {
        type: 'object',
        required: ['id'],
        properties: {
            id: { type: 'string', format: 'uuid' },
        },
    },
    body: {
        type: 'object',
        properties: {
            name: { type: 'string', minLength: 1, maxLength: 255 },
            description: { type: 'string' },
            type: { type: 'string', enum: mapTypeEnum },
        },
    },
    response: {
        200: {
            type: 'object',
            properties: {
                id: { type: 'string', format: 'uuid' },
                message: { type: 'string' },
            },
        },
        404: {
            type: 'object',
            properties: { message: { type: 'string' } },
        },
    },
} as const;

export const DeleteMapSchema = {
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
            properties: { message: { type: 'string' } },
        },
        404: {
            type: 'object',
            properties: { message: { type: 'string' } },
        },
    },
} as const;

const lifecycleParamsSchema = {
    type: 'object',
    required: ['id'],
    properties: {
        id: { type: 'string', format: 'uuid' },
    },
} as const;

const lifecycleResponseSchema = {
    200: {
        type: 'object',
        properties: {
            id: { type: 'string', format: 'uuid' },
            status: { type: 'string', enum: mapStatusEnum },
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
} as const;

export const DevelopMapSchema = {
    params: lifecycleParamsSchema,
    response: lifecycleResponseSchema,
} as const;

export const ValidateMapSchema = {
    params: lifecycleParamsSchema,
    response: lifecycleResponseSchema,
} as const;

export const RevokeMapSchema = {
    params: lifecycleParamsSchema,
    body: {
        type: 'object',
        properties: {
            reason: { type: 'string' },
        },
    },
    response: lifecycleResponseSchema,
} as const;

export const RedevelopMapSchema = {
    params: lifecycleParamsSchema,
    response: lifecycleResponseSchema,
} as const;
