const configIdPattern = '^[0-9a-fA-F]{24}$';

const configCompatItem = {
    type: 'object',
    properties: {
        configId: { type: 'string' },
        notes: { type: 'string', nullable: true },
    },
} as const;

export const GetConfigsSchema = {
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
                configs: { type: 'array', items: configCompatItem },
                message: { type: 'string' },
            },
        },
        404: {
            type: 'object',
            properties: { message: { type: 'string' } },
        },
    },
} as const;

export const AddConfigSchema = {
    params: {
        type: 'object',
        required: ['id'],
        properties: {
            id: { type: 'string', format: 'uuid' },
        },
    },
    body: {
        type: 'object',
        required: ['configId'],
        properties: {
            configId: { type: 'string', pattern: configIdPattern },
            notes: { type: 'string', maxLength: 255 },
        },
    },
    response: {
        201: {
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

export const RemoveConfigSchema = {
    params: {
        type: 'object',
        required: ['id', 'configId'],
        properties: {
            id: { type: 'string', format: 'uuid' },
            configId: { type: 'string', pattern: configIdPattern },
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
