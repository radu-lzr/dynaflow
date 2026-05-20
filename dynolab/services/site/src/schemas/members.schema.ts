export const GetMembersSchema = {
    params: {
        type: 'object',
        required: ['siteId'],
        properties: {
            siteId: { type: 'string', format: 'uuid' },
        },
    },
    response: {
        200: {
            type: 'object',
            properties: {
                items: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            userId: { type: 'string', format: 'uuid' },
                            siteId: { type: 'string', format: 'uuid' },
                            joinedAt: { type: 'string', format: 'date-time' },
                        },
                    },
                },
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

export const AddMemberSchema = {
    params: {
        type: 'object',
        required: ['siteId'],
        properties: {
            siteId: { type: 'string', format: 'uuid' },
        },
    },
    body: {
        type: 'object',
        required: ['userId'],
        properties: {
            userId: { type: 'string', format: 'uuid' },
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

export const RemoveMemberSchema = {
    params: {
        type: 'object',
        required: ['siteId', 'userId'],
        properties: {
            siteId: { type: 'string', format: 'uuid' },
            userId: { type: 'string', format: 'uuid' },
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
