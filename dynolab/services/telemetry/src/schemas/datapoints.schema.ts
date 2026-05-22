const sessionIdParam = {
    type: 'object',
    required: ['sessionId'],
    properties: {
        sessionId: { type: 'string', format: 'uuid' },
    },
} as const;

const datapointItem = {
    type: 'object',
    properties: {
        sessionId: { type: 'string', format: 'uuid' },
        timestamp: { type: 'string', format: 'date-time' },
        rpm: { type: 'integer', nullable: true },
        horsepower: { type: 'number', nullable: true },
        torque: { type: 'number', nullable: true },
        boostPressure: { type: 'number', nullable: true },
        intakeTemp: { type: 'number', nullable: true },
        exhaustTemp: { type: 'number', nullable: true },
        afr: { type: 'number', nullable: true },
        knockCount: { type: 'integer', nullable: true },
        oilTemp: { type: 'number', nullable: true },
        coolantTemp: { type: 'number', nullable: true },
    },
} as const;

export const AddDatapointsSchema = {
    params: sessionIdParam,
    body: {
        type: 'object',
        required: ['datapoints'],
        properties: {
            datapoints: {
                type: 'array',
                minItems: 1,
                items: {
                    type: 'object',
                    required: ['timestamp'],
                    properties: {
                        timestamp: { type: 'string', format: 'date-time' },
                        rpm: { type: 'integer' },
                        horsepower: { type: 'number' },
                        torque: { type: 'number' },
                        boostPressure: { type: 'number' },
                        intakeTemp: { type: 'number' },
                        exhaustTemp: { type: 'number' },
                        afr: { type: 'number' },
                        knockCount: { type: 'integer' },
                        oilTemp: { type: 'number' },
                        coolantTemp: { type: 'number' },
                    },
                },
            },
        },
    },
    response: {
        201: {
            type: 'object',
            properties: {
                insertedCount: { type: 'integer' },
                message: { type: 'string' },
            },
        },
        404: {
            type: 'object',
            properties: { message: { type: 'string' } },
        },
    },
} as const;

export const GetDatapointsSchema = {
    params: sessionIdParam,
    querystring: {
        type: 'object',
        properties: {
            from: { type: 'string', format: 'date-time' },
            to: { type: 'string', format: 'date-time' },
            downsample: { type: 'integer', minimum: 2 },
        },
    },
    response: {
        200: {
            type: 'object',
            properties: {
                datapoints: { type: 'array', items: datapointItem },
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

export const DeleteDatapointsSchema = {
    params: sessionIdParam,
    response: {
        200: {
            type: 'object',
            properties: {
                deletedCount: { type: 'integer' },
                message: { type: 'string' },
            },
        },
        404: {
            type: 'object',
            properties: { message: { type: 'string' } },
        },
    },
} as const;
