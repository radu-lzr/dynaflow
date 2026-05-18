export const VerifyTokenSchema = {
    headers: {
        type: 'object',
        required: ['authorization'],
        properties: {
            authorization: { type: 'string' }
        },
    },
    response: {
        200: {
            type: 'object',
            properties: {
                userId: { type: 'string' , format: 'uuid' },
                accountType: { type: 'string' , enum: ['internal', 'client'] },
                message: { type: 'string' }
            },
        },
        401: {
            type: 'object',
            properties: {
                message: { type: 'string' }
            }
        }
    }
} as const;