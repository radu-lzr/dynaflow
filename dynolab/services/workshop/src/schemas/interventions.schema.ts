const statusEnum = ['pending', 'in_progress', 'completed', 'delivered'] as const;
const typeEnum = ['remap', 'diagnostics', 'bench_only', 'custom'] as const;
const benchTypeEnum = ['before', 'after'] as const;

const interventionItem = {
    type: 'object',
    properties: {
        id: { type: 'string', format: 'uuid' },
        clientVehicleId: { type: 'string', format: 'uuid' },
        siteId: { type: 'string', format: 'uuid' },
        technicianId: { type: 'string', format: 'uuid' },
        mapId: { type: 'string', format: 'uuid', nullable: true },
        mapVersionId: { type: 'string', format: 'uuid', nullable: true },
        type: { type: 'string', enum: typeEnum },
        status: { type: 'string', enum: statusEnum },
        notes: { type: 'string', nullable: true },
        startedAt: { type: 'string', format: 'date-time', nullable: true },
        completedAt: { type: 'string', format: 'date-time', nullable: true },
        deliveredAt: { type: 'string', format: 'date-time', nullable: true },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
    },
} as const;

const statusHistoryItem = {
    type: 'object',
    properties: {
        id: { type: 'string', format: 'uuid' },
        fromStatus: { type: 'string', nullable: true },
        toStatus: { type: 'string' },
        changedBy: { type: 'string', format: 'uuid' },
        reason: { type: 'string', nullable: true },
        changedAt: { type: 'string', format: 'date-time' },
    },
} as const;

export const GetInterventionsSchema = {
    querystring: {
        type: 'object',
        properties: {
            page: { type: 'integer', minimum: 1, default: 1 },
            limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
            clientVehicleId: { type: 'string', format: 'uuid' },
            siteId: { type: 'string', format: 'uuid' },
            technicianId: { type: 'string', format: 'uuid' },
            mapId: { type: 'string', format: 'uuid' },
            status: { type: 'string', enum: statusEnum },
            type: { type: 'string', enum: typeEnum },
        },
    },
    response: {
        200: {
            type: 'object',
            properties: {
                interventions: { type: 'array', items: interventionItem },
                totalCount: { type: 'integer' },
                page: { type: 'integer' },
                limit: { type: 'integer' },
                message: { type: 'string' },
            },
        },
    },
} as const;

export const GetInterventionByIdSchema = {
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
                ...interventionItem.properties,
                statusHistory: { type: 'array', items: statusHistoryItem },
                message: { type: 'string' },
            },
        },
        404: {
            type: 'object',
            properties: { message: { type: 'string' } },
        },
    },
} as const;

export const CreateInterventionSchema = {
    body: {
        type: 'object',
        required: ['clientVehicleId', 'siteId', 'technicianId', 'type'],
        properties: {
            clientVehicleId: { type: 'string', format: 'uuid' },
            siteId: { type: 'string', format: 'uuid' },
            technicianId: { type: 'string', format: 'uuid' },
            mapId: { type: 'string', format: 'uuid' },
            mapVersionId: { type: 'string', format: 'uuid' },
            type: { type: 'string', enum: typeEnum },
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
    },
} as const;

export const UpdateInterventionSchema = {
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
            mapId: { type: 'string', format: 'uuid' },
            mapVersionId: { type: 'string', format: 'uuid' },
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

export const DeleteInterventionSchema = {
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

export const StartInterventionSchema = {
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
                status: { type: 'string' },
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

export const CompleteInterventionSchema = {
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
            notes: { type: 'string' },
        },
    },
    response: {
        200: {
            type: 'object',
            properties: {
                id: { type: 'string', format: 'uuid' },
                status: { type: 'string' },
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

export const DeliverInterventionSchema = {
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
                status: { type: 'string' },
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

export const AssignTechnicianSchema = {
    params: {
        type: 'object',
        required: ['id'],
        properties: {
            id: { type: 'string', format: 'uuid' },
        },
    },
    body: {
        type: 'object',
        required: ['technicianId'],
        properties: {
            technicianId: { type: 'string', format: 'uuid' },
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

export const CreateBenchSessionProxySchema = {
    params: {
        type: 'object',
        required: ['id'],
        properties: {
            id: { type: 'string', format: 'uuid' },
        },
    },
    body: {
        type: 'object',
        required: ['type'],
        properties: {
            type: { type: 'string', enum: benchTypeEnum },
            benchId: { type: 'string', format: 'uuid' },
            notes: { type: 'string' },
        },
    },
    response: {
        201: {
            type: 'object',
            properties: {
                sessionId: { type: 'string', format: 'uuid' },
                message: { type: 'string' },
            },
        },
        404: {
            type: 'object',
            properties: { message: { type: 'string' } },
        },
        502: {
            type: 'object',
            properties: { message: { type: 'string' } },
        },
    },
} as const;
