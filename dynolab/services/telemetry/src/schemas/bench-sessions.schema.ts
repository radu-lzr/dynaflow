const sessionTypeEnum = ['before', 'after'] as const;

const sessionItem = {
    type: 'object',
    properties: {
        id: { type: 'string', format: 'uuid' },
        interventionId: { type: 'string', format: 'uuid' },
        type: { type: 'string', enum: sessionTypeEnum },
        benchId: { type: 'string', format: 'uuid', nullable: true },
        peakHp: { type: 'number', nullable: true },
        peakTorque: { type: 'number', nullable: true },
        notes: { type: 'string', nullable: true },
        startedAt: { type: 'string', format: 'date-time' },
        endedAt: { type: 'string', format: 'date-time', nullable: true },
        createdAt: { type: 'string', format: 'date-time' },
    },
} as const;

export const CreateBenchSessionSchema = {
    body: {
        type: 'object',
        required: ['interventionId', 'type', 'startedAt'],
        properties: {
            interventionId: { type: 'string', format: 'uuid' },
            type: { type: 'string', enum: sessionTypeEnum },
            benchId: { type: 'string', format: 'uuid' },
            notes: { type: 'string' },
            startedAt: { type: 'string', format: 'date-time' },
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

export const GetBenchSessionsSchema = {
    querystring: {
        type: 'object',
        properties: {
            page: { type: 'integer', minimum: 1, default: 1 },
            limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
            interventionId: { type: 'string', format: 'uuid' },
            type: { type: 'string', enum: sessionTypeEnum },
        },
    },
    response: {
        200: {
            type: 'object',
            properties: {
                sessions: { type: 'array', items: sessionItem },
                totalCount: { type: 'integer' },
                page: { type: 'integer' },
                limit: { type: 'integer' },
                message: { type: 'string' },
            },
        },
    },
} as const;

export const CompareBenchSessionsSchema = {
    querystring: {
        type: 'object',
        required: ['interventionId'],
        properties: {
            interventionId: { type: 'string', format: 'uuid' },
        },
    },
    response: {
        200: {
            type: 'object',
            properties: {
                before: {
                    nullable: true,
                    type: 'object',
                    properties: {
                        sessionId: { type: 'string', format: 'uuid' },
                        peakHp: { type: 'number', nullable: true },
                        peakTorque: { type: 'number', nullable: true },
                    },
                },
                after: {
                    nullable: true,
                    type: 'object',
                    properties: {
                        sessionId: { type: 'string', format: 'uuid' },
                        peakHp: { type: 'number', nullable: true },
                        peakTorque: { type: 'number', nullable: true },
                    },
                },
                gains: {
                    nullable: true,
                    type: 'object',
                    properties: {
                        hp: { type: 'number' },
                        torque: { type: 'number' },
                        hpPercent: { type: 'number' },
                        torquePercent: { type: 'number' },
                    },
                },
                message: { type: 'string' },
            },
        },
        404: {
            type: 'object',
            properties: { message: { type: 'string' } },
        },
    },
} as const;

export const GetBenchSessionByIdSchema = {
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
                interventionId: { type: 'string', format: 'uuid' },
                type: { type: 'string', enum: sessionTypeEnum },
                benchId: { type: 'string', format: 'uuid', nullable: true },
                peakHp: { type: 'number', nullable: true },
                peakTorque: { type: 'number', nullable: true },
                notes: { type: 'string', nullable: true },
                startedAt: { type: 'string', format: 'date-time' },
                endedAt: { type: 'string', format: 'date-time', nullable: true },
                createdAt: { type: 'string', format: 'date-time' },
                datapointCount: { type: 'integer' },
                obdLogCount: { type: 'integer' },
                message: { type: 'string' },
            },
        },
        404: {
            type: 'object',
            properties: { message: { type: 'string' } },
        },
    },
} as const;

export const UpdateBenchSessionSchema = {
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
            peakHp: { type: 'number' },
            peakTorque: { type: 'number' },
            notes: { type: 'string' },
            endedAt: { type: 'string', format: 'date-time' },
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

export const DeleteBenchSessionSchema = {
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
