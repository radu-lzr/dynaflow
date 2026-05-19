export const AssignRolesToUserSchema = {
    body: {
        type: 'object',
        required: ['userId', 'roleId'],
        properties: {
            userId: { type: 'string', format: 'uuid' },
            roleId: { type: 'string', format: 'uuid' },
            siteId: { type: 'string', format: 'uuid' , nullable: true }
        }
    },
    response: {
        201: {
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
        },
        409: {
            type: 'object',
            properties: {
                message: { type: 'string' }
            }
        }
    }
} as const;

export const GetUserRolesSchema = {
    params: {
        type: 'object',
        required: ['userId'],
        properties: {
            userId: { type: 'string', format: 'uuid' }
        }
    },
    querystring: {
        type: 'object',
        properties: {
            siteId: { type: 'string', format: 'uuid' }
        }
    },
    response: {
        200: {
            type: 'object',
            properties: {
                roles: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            roleId: { type: 'string', format: 'uuid' },
                            roleName: { type: 'string' },
                            siteId: { type: 'string', format: 'uuid', nullable: true },
                            assignedAt: { type: 'string', format: 'date-time' }
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

export const RemoveRoleFromUserSchema = {
    body: {
        type: 'object',
        required: ['userId', 'roleId'],
        properties: {
            userId: { type: 'string', format: 'uuid' },
            roleId: { type: 'string', format: 'uuid' },
            siteId: { type: 'string', format: 'uuid' , nullable: true }
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
