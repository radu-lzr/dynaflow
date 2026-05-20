export const CheckAccessSchema = {
    body: {
        type: 'object',
        required: ['userId', 'method', 'path'],
        properties: {
            userId: { type: 'string', format: 'uuid' },
            method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] },
            path: { type: 'string' },
            resourceId: { type: 'string', format: 'uuid' },
        }
    },
    response: {
        200: {
            type: 'object',
            properties: {
                allowed: { type: 'boolean' },
                scope: { type: 'string' , format: 'uuid', nullable: true }, 
                message: { type: 'string' }
            },
        },
        403: {
            type: 'object',
            properties: {
                message: { type: 'string' }
            }
        },
    }

} as const;