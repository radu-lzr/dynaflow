export const CreateTempPermissionSchema = {
    body: {
        type: 'object',
        required: ['userId', 'code', 'resourceId', 'linkedTo', 'ttlSeconds'],
        properties: {
            userId: { type: 'string', format: 'uuid' },
            code: { type: 'string',  pattern: '^[a-z][a-z0-9_]*:[a-z][a-z0-9_]*$' },
            resourceId: { type: 'string', format: 'uuid' },
            linkedTo: { type: 'string', format: 'uuid'},
            ttlSeconds: { type: 'integer', minimum: 1 }
            }
    },
    response: {
        201: {
            type: 'object',
            properties: {
                id: { type: 'string', format: 'uuid' },
                expiresAt: { type: 'string', format: 'date-time' },
                message: { type: 'string' }
            }
        },
        404: {
            type: 'object',
            properties: {
                message: { type: 'string' }
            }
        },
    }
} as const;

export const GetUserTempPermissionsSchema = {
    params: {
        type: 'object',
        required: ['userId'],
        properties: {
            userId: { type: 'string', format: 'uuid' }
        }
    },
    response: {
        200: {
            type: 'object',
            properties: {
                permissions: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            id: { type: 'string', format: 'uuid' },
                            code: { type: 'string',  pattern: '^[a-z][a-z0-9_]*:[a-z][a-z0-9_]*$' },
                            resourceId: { type: 'string', format: 'uuid' },
                            linkedTo: { type: 'string', format: 'uuid'},
                            expiresAt: { type: 'string', format: 'date-time' },
                            createdAt: { type: 'string', format : 'date-time' }
                        }
                    }
                },
                message: { type: 'string' }
            }
        },
        404: {
            type: 'object',
            properties: {
                message: { type: 'string' }
            }
        }
    }
} as const;

export const RemoveTempPermissionByLinkedToSchema = {
    params: {
        type: 'object',
        required: ['linkedTo'],
        properties: {
            linkedTo: { type: 'string', format: 'uuid' }
        }
    },
    response: {
        200: {
            type: 'object',
            properties: {
                message: { type: 'string' }
            }
        },
        404: {
            type: 'object',
            properties: {
                message: { type: 'string' }
            }
        }
    }
} as const;

export const RemoveTempPermissionByIdSchema = {
    params: {
        type: 'object',
        required: ['id'],
        properties: {
            id: { type: 'string', format: 'uuid' }
        }
    },
    response: {
        200: {
            type: 'object',
            properties: {
                message: { type: 'string' }
            }
        },
        404: {
            type: 'object',
            properties: {
                message: { type: 'string' }
            }
        }
    }
} as const;
