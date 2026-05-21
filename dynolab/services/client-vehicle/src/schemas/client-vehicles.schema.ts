const modificationItem = {
    type: 'object',
    properties: {
        id: { type: 'string', format: 'uuid' },
        vehicleId: { type: 'string', format: 'uuid' },
        category: { type: 'string' },
        description: { type: 'string' },
        installedAt: { type: 'string', nullable: true },
        createdAt: { type: 'string', format: 'date-time' },
    },
} as const;

const vehicleItem = {
    type: 'object',
    properties: {
        id: { type: 'string', format: 'uuid' },
        ownerId: { type: 'string', format: 'uuid' },
        configId: { type: 'string' },
        vin: { type: 'string' },
        plateNumber: { type: 'string', nullable: true },
        mileage: { type: 'integer', nullable: true },
        notes: { type: 'string', nullable: true },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
    },
} as const;

export const GetClientVehiclesSchema = {
    querystring: {
        type: 'object',
        properties: {
            page: { type: 'integer', minimum: 1, default: 1 },
            limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
            ownerId: { type: 'string', format: 'uuid' },
            configId: { type: 'string', pattern: '^[0-9a-fA-F]{24}$' },
            search: { type: 'string' },
        },
    },
    response: {
        200: {
            type: 'object',
            properties: {
                vehicles: { type: 'array', items: vehicleItem },
                totalCount: { type: 'integer' },
                page: { type: 'integer' },
                limit: { type: 'integer' },
                message: { type: 'string' },
            },
        },
    },
} as const;

export const GetClientVehicleByIdSchema = {
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
                ownerId: { type: 'string', format: 'uuid' },
                configId: { type: 'string' },
                vin: { type: 'string' },
                plateNumber: { type: 'string', nullable: true },
                mileage: { type: 'integer', nullable: true },
                notes: { type: 'string', nullable: true },
                modifications: { type: 'array', items: modificationItem },
                createdAt: { type: 'string', format: 'date-time' },
                updatedAt: { type: 'string', format: 'date-time' },
                message: { type: 'string' },
            },
        },
        404: {
            type: 'object',
            properties: { message: { type: 'string' } },
        },
    },
} as const;

export const CreateClientVehicleSchema = {
    body: {
        type: 'object',
        required: ['ownerId', 'configId', 'vin'],
        properties: {
            ownerId: { type: 'string', format: 'uuid' },
            configId: { type: 'string', pattern: '^[0-9a-fA-F]{24}$' },
            vin: { type: 'string', pattern: '^[A-HJ-NPR-Z0-9]{17}$', minLength: 17, maxLength: 17 },
            plateNumber: { type: 'string', maxLength: 20 },
            mileage: { type: 'integer', minimum: 0 },
            notes: { type: 'string' },
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
        409: {
            type: 'object',
            properties: { message: { type: 'string' } },
        },
    },
} as const;

export const UpdateClientVehicleSchema = {
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
            plateNumber: { type: 'string', maxLength: 20 },
            mileage: { type: 'integer', minimum: 0 },
            notes: { type: 'string' },
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

export const DeleteClientVehicleSchema = {
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
