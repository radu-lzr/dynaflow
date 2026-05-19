export const AssignPermissionsToUserSchema = {
    body: {
        type: 'object',
        required: ['userId', 'code', 'resourceId'],
        properties: {
            userId: { type: 'string', format: 'uuid' },
            code: { type: 'string' , pattern: '^[a-z][a-z0-9_]*:[a-z][a-z0-9_]*$'}, // e.g., 'read:users', 'write:roles'
            resourceId: { type: 'string', format: 'uuid' },
            siteId: { type: 'string', format: 'uuid', nullable: true }
        }
    },
    response: {
        201: {
            type: 'object',
            properties: {
                id: { type: 'string', format: 'uuid' },
                message: { type: 'string' }
            }
        },
        409: {
            type: 'object',
            properties: {
                message: { type: 'string' }
            }
        }
    }
} as const;

export const GetUserPermissionsSchema = {
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
                            code: { type: 'string',  pattern: '^[a-z][a-z0-9_]*:[a-z][a-z0-9_]*$' },
                            resourceId: { type: 'string', format: 'uuid' },
                            grantedBy: { type: 'string', format: 'uuid' },
                            grantedAt: { type: 'string', format: 'date-time' }
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

export const RemovePermissionFromUserSchema = {
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

