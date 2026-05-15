export const GetUsersSchema = {
    querystring: {
        type: 'object',
        properties: {
            page: { type: 'number', minimum: 1, default: 1 },
            limit: { type: 'number', minimum: 1, maximum: 100, default: 20 },
            search: { type: 'string' },
            accountType: { type: 'string', enum: ['internal', 'client'] },
            isActive: { type: 'boolean' }
        },
    },
    response: {
        200: {
            type: 'object',
            properties: {
                users: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            id: { type: 'string', format: 'uuid' },
                            email: { type: 'string', format: 'email' },
                            firstName: { type: 'string' },
                            lastName: { type: 'string' },
                            accountType: { type: 'string', enum: ['internal', 'client'] },
                            createdAt: { type: 'string', format: 'date-time' },
                            isActive: { type: 'boolean' }
                        },
                    },
                },
                totalCount: { type: 'number' },
                page: { type: 'number' },
                limit: { type: 'number' },
                message : { type: 'string' }
            },
        },
        401: {
            type: 'object',
            properties: {
                message: { type: 'string' }
            }
        }
    }
};

export const GetUserByIdSchema = {
    params: {
        type: 'object',
        required: ['id'],
        properties: {
            id: { type: 'string', format: 'uuid' }
        },
    },
    response: {
        200: {
            type: 'object',
            properties: {
                id: { type: 'string', format: 'uuid' },
                email: { type: 'string', format: 'email' },
                firstName: { type: 'string' },
                lastName: { type: 'string' },
                accountType: { type: 'string', enum: ['internal', 'client'] },
                createdAt: { type: 'string', format: 'date-time' },
                updatedAt: { type: 'string', format: 'date-time' },
                isActive: { type: 'boolean' },
                mfaEnabled: { type: 'boolean' },
                lastLogin: { type: 'string', format: 'date-time' },
                message : { type: 'string' }
            },
        },
        401: {
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
};

export const UpdateUserSchema = {
    params: {
        type: 'object',
        required: ['id'],
        properties: {
            id: { type: 'string', format: 'uuid' }
        },
    },
    body: {
        type: 'object',
        properties: {
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            phone: { type: 'string', pattern: '^\\+?[1-9]\\d{1,14}$' },
            mfaEnabled: { type: 'boolean' },
        },
    },
    response: {
        200: {
            type: 'object',
            properties: {
                id: { type: 'string', format: 'uuid' },
                firstName: { type: 'string' },
                lastName: { type: 'string' },
                phone: { type: 'string' },
                mfaEnabled: { type: 'boolean' },
                updatedAt: { type: 'string', format: 'date-time' },
                message : { type: 'string' }
            },
        },
        404: {
            type: 'object',
            properties: {
                message: { type: 'string' }
            }
        },
    }
};

export const DeleteUserSchema = {
    params: {
        type: 'object',
        required: ['id'],
        properties: {
            id: { type: 'string', format: 'uuid' }
        },
    },
    response: {
        200: {
            type: 'object',
            properties: {
                message : { type: 'string' }
            },
        },
        404: {
            type: 'object',
            properties: {
                message: { type: 'string' }
            }
        },
    }
};        