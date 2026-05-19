export const GetPermissionsSchema = {
    querystring: {
        type: 'object',
        properties: {
            page: { type: 'integer', minimum: 1, default: 1 },
            limit: { type: 'integer', minimum: 1, maximum: 100, default: 10 },
            search: { type: 'string', nullable: true }
        },
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
                            permissionCode: { type: 'string' },
                            description: { type: 'string', nullable: true },
                            createdAt: { type: 'string', format: 'date-time' }
                        }
                    }
                },
                totalCount: { type: 'integer' },
                page: { type: 'integer' },
                limit: { type: 'integer' },
                message: { type: 'string' }
            }
        }
    }
 } as const;

export const CreatePermissionSchema = {
    body: {
        type: 'object',
        required: ['permissionCode'],
        properties: {
            permissionCode: { type: 'string' , pattern: '^[a-z][a-z0-9_]*:[a-z][a-z0-9_]*$'}, // e.g., 'read:users', 'write:roles'
            description: { type: 'string', nullable: true }
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

export const DeletePermissionSchema = {
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