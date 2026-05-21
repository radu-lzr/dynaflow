const vehicleIdParam = {
    type: 'object',
    required: ['id'],
    properties: {
        id: { type: 'string', pattern: '^[0-9a-fA-F]{24}$' },
    },
} as const;

const vehicleObject = {
    type: 'object',
    properties: {
        id: { type: 'string' },
        brand: { type: 'string' },
        model: { type: 'string' },
        yearStart: { type: 'integer' },
        yearEnd: { type: 'integer', nullable: true },
        engineCode: { type: 'string' },
        fuelType: { type: 'string' },
        ecuType: { type: 'string' },
        stockHp: { type: 'integer' },
        stockTorque: { type: 'integer' },
        specs: { type: 'object', additionalProperties: true },
        tags: { type: 'array', items: { type: 'string' } },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
    },
} as const;

export const GetVehiclesSchema = {
    querystring: {
        type: 'object',
        properties: {
            page: { type: 'integer', minimum: 1, default: 1 },
            limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
            search: { type: 'string' },
            brand: { type: 'string' },
            fuelType: { type: 'string', enum: ['gasoline', 'diesel', 'e85', 'hybrid'] },
            ecuType: { type: 'string' },
            tags: { type: 'string' },
        },
    },
    response: {
        200: {
            type: 'object',
            properties: {
                vehicles: { type: 'array', items: vehicleObject },
                totalCount: { type: 'integer' },
                page: { type: 'integer' },
                limit: { type: 'integer' },
                message: { type: 'string' },
            },
        },
    },
} as const;

export const GetVehicleByIdSchema = {
    params: vehicleIdParam,
    response: {
        200: {
            type: 'object',
            properties: {
                ...vehicleObject.properties,
                message: { type: 'string' },
            },
        },
        404: {
            type: 'object',
            properties: { message: { type: 'string' } },
        },
    },
} as const;

export const CreateVehicleSchema = {
    body: {
        type: 'object',
        required: ['brand', 'model', 'yearStart', 'engineCode', 'fuelType', 'ecuType', 'stockHp', 'stockTorque'],
        properties: {
            brand: { type: 'string', maxLength: 100 },
            model: { type: 'string', maxLength: 100 },
            yearStart: { type: 'integer' },
            yearEnd: { type: 'integer', nullable: true },
            engineCode: { type: 'string', maxLength: 100 },
            fuelType: { type: 'string', enum: ['gasoline', 'diesel', 'e85', 'hybrid'] },
            ecuType: { type: 'string', maxLength: 100 },
            stockHp: { type: 'integer' },
            stockTorque: { type: 'integer' },
            specs: { type: 'object', additionalProperties: true },
            tags: { type: 'array', items: { type: 'string' } },
        },
    },
    response: {
        201: {
            type: 'object',
            properties: {
                id: { type: 'string' },
                message: { type: 'string' },
            },
        },
    },
} as const;

export const UpdateVehicleSchema = {
    params: vehicleIdParam,
    body: {
        type: 'object',
        properties: {
            brand: { type: 'string', maxLength: 100 },
            model: { type: 'string', maxLength: 100 },
            yearStart: { type: 'integer' },
            yearEnd: { type: 'integer', nullable: true },
            engineCode: { type: 'string', maxLength: 100 },
            fuelType: { type: 'string', enum: ['gasoline', 'diesel', 'e85', 'hybrid'] },
            ecuType: { type: 'string', maxLength: 100 },
            stockHp: { type: 'integer' },
            stockTorque: { type: 'integer' },
            specs: { type: 'object', additionalProperties: true },
            tags: { type: 'array', items: { type: 'string' } },
        },
    },
    response: {
        200: {
            type: 'object',
            properties: {
                id: { type: 'string' },
                message: { type: 'string' },
            },
        },
        404: {
            type: 'object',
            properties: { message: { type: 'string' } },
        },
    },
} as const;

export const DeleteVehicleSchema = {
    params: vehicleIdParam,
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

export const GetTagsSchema = {
    response: {
        200: {
            type: 'object',
            properties: {
                tags: { type: 'array', items: { type: 'string' } },
                message: { type: 'string' },
            },
        },
    },
} as const;
