const sessionIdParam = {
    type: 'object',
    required: ['sessionId'],
    properties: {
        sessionId: { type: 'string', format: 'uuid' },
    },
} as const;

const obdLogItem = {
    type: 'object',
    properties: {
        sessionId: { type: 'string', format: 'uuid' },
        timestamp: { type: 'string', format: 'date-time' },
        pid: { type: 'string' },
        value: { type: 'number' },
        unit: { type: 'string', nullable: true },
    },
} as const;

export const AddObdLogsSchema = {
    params: sessionIdParam,
    body: {
        type: 'object',
        required: ['logs'],
        properties: {
            logs: {
                type: 'array',
                minItems: 1,
                items: {
                    type: 'object',
                    required: ['timestamp', 'pid', 'value'],
                    properties: {
                        timestamp: { type: 'string', format: 'date-time' },
                        pid: { type: 'string', maxLength: 10 },
                        value: { type: 'number' },
                        unit: { type: 'string', maxLength: 20 },
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

export const GetObdLogsSchema = {
    params: sessionIdParam,
    querystring: {
        type: 'object',
        properties: {
            pid: { type: 'string' },
            from: { type: 'string', format: 'date-time' },
            to: { type: 'string', format: 'date-time' },
        },
    },
    response: {
        200: {
            type: 'object',
            properties: {
                logs: { type: 'array', items: obdLogItem },
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

export const DeleteObdLogsSchema = {
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
