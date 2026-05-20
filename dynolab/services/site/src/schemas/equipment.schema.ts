const equipmentTypeEnum = ['dyno_bench', 'diag_tool', 'ecu_flasher', 'other'] as const;

const equipmentItem = {
    type: 'object',
    properties: {
        id: { type: 'string', format: 'uuid' },
        siteId: { type: 'string', format: 'uuid' },
        type: { type: 'string', enum: equipmentTypeEnum },
        brand: { type: 'string', nullable: true },
        model: { type: 'string', nullable: true },
        serialNumber: { type: 'string', nullable: true },
        isOperational: { type: 'boolean' },
        createdAt: { type: 'string', format: 'date-time' },
    },
} as const;

export const GetEquipmentSchema = {
    params: {
        type: 'object',
        required: ['siteId'],
        properties: {
            siteId: { type: 'string', format: 'uuid' },
        },
    },
    querystring: {
        type: 'object',
        properties: {
            type: { type: 'string', enum: equipmentTypeEnum },
            isOperational: { type: 'boolean' },
        },
    },
    response: {
        200: {
            type: 'object',
            properties: {
                items: { type: 'array', items: equipmentItem },
                totalCount: { type: 'integer' },
                message: { type: 'string' },
            },
        },
        404: {
            type: 'object',
            properties: { message: { type: 'string' } },
        },
    },
} as const;

export const CreateEquipmentSchema = {
    params: {
        type: 'object',
        required: ['siteId'],
        properties: {
            siteId: { type: 'string', format: 'uuid' },
        },
    },
    body: {
        type: 'object',
        required: ['type'],
        properties: {
            type: { type: 'string', enum: equipmentTypeEnum },
            brand: { type: 'string', maxLength: 100 },
            model: { type: 'string', maxLength: 100 },
            serialNumber: { type: 'string', maxLength: 100 },
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
        404: {
            type: 'object',
            properties: { message: { type: 'string' } },
        },
    },
} as const;

export const UpdateEquipmentSchema = {
    params: {
        type: 'object',
        required: ['siteId', 'id'],
        properties: {
            siteId: { type: 'string', format: 'uuid' },
            id: { type: 'string', format: 'uuid' },
        },
    },
    body: {
        type: 'object',
        properties: {
            type: { type: 'string', enum: equipmentTypeEnum },
            brand: { type: 'string', maxLength: 100 },
            model: { type: 'string', maxLength: 100 },
            serialNumber: { type: 'string', maxLength: 100 },
            isOperational: { type: 'boolean' },
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
        400: {
            type: 'object',
            properties: { message: { type: 'string' } },
        },
        404: {
            type: 'object',
            properties: { message: { type: 'string' } },
        },
    },
} as const;

export const DeleteEquipmentSchema = {
    params: {
        type: 'object',
        required: ['siteId', 'id'],
        properties: {
            siteId: { type: 'string', format: 'uuid' },
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
