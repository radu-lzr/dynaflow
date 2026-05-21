const modificationCategoryEnum = ['turbo', 'exhaust', 'intake', 'injectors', 'intercooler', 'ecu', 'suspension', 'brakes', 'other'] as const;

const vehicleIdParam = {
    type: 'object',
    required: ['vehicleId'],
    properties: {
        vehicleId: { type: 'string', format: 'uuid' },
    },
} as const;

const modificationItem = {
    type: 'object',
    properties: {
        id: { type: 'string', format: 'uuid' },
        vehicleId: { type: 'string', format: 'uuid' },
        category: { type: 'string', enum: modificationCategoryEnum },
        description: { type: 'string' },
        installedAt: { type: 'string', nullable: true },
        createdAt: { type: 'string', format: 'date-time' },
    },
} as const;

export const GetModificationsSchema = {
    params: vehicleIdParam,
    response: {
        200: {
            type: 'object',
            properties: {
                modifications: { type: 'array', items: modificationItem },
                message: { type: 'string' },
            },
        },
        404: {
            type: 'object',
            properties: { message: { type: 'string' } },
        },
    },
} as const;

export const CreateModificationSchema = {
    params: vehicleIdParam,
    body: {
        type: 'object',
        required: ['category', 'description'],
        properties: {
            category: { type: 'string', enum: modificationCategoryEnum },
            description: { type: 'string', maxLength: 255 },
            installedAt: { type: 'string', format: 'date' },
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

export const UpdateModificationSchema = {
    params: {
        type: 'object',
        required: ['vehicleId', 'id'],
        properties: {
            vehicleId: { type: 'string', format: 'uuid' },
            id: { type: 'string', format: 'uuid' },
        },
    },
    body: {
        type: 'object',
        properties: {
            category: { type: 'string', enum: modificationCategoryEnum },
            description: { type: 'string', maxLength: 255 },
            installedAt: { type: 'string', format: 'date' },
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

export const DeleteModificationSchema = {
    params: {
        type: 'object',
        required: ['vehicleId', 'id'],
        properties: {
            vehicleId: { type: 'string', format: 'uuid' },
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
