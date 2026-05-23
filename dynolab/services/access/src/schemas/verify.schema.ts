export const VerifyAccessSchema = {
    headers: {
        type: 'object',
        required: ['x-user-id', 'x-original-uri', 'x-original-method'],
        properties: {
            'x-user-id': { type: 'string' },
            'x-account-type': { type: 'string' },
            'x-original-uri': { type: 'string' },
            'x-original-method': { type: 'string', enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] },
        },
    },
    response: {
        200: {
            type: 'object',
            properties: {
                allowed: { type: 'boolean' },
                message: { type: 'string' },
            },
        },
        401: {
            type: 'object',
            properties: { message: { type: 'string' } },
        },
        403: {
            type: 'object',
            properties: { message: { type: 'string' } },
        },
    },
} as const;
