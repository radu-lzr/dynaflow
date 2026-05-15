export const RegisterUserSchema = {
    body: {
        type: 'object',
        required: ['email', 'password', 'firstName', 'lastName', 'accountType'],
        properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 8 },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            accountType: { type: 'string', enum: ['internal', 'client'] },
            phone: { type: 'string', pattern: '^\\+?[1-9]\\d{1,14}$' }
        },
    },
    response: {
        201: {
            type: 'object',
            properties: {
                id: { type: 'string', format: 'uuid' },
                message: { type: 'string' }
            },
        },
        409: {
            type: 'object',
            properties: {
                message: { type: 'string' }
            }
        }
    }
};  

export const LoginUserSchema = {
    body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string' , minLength: 1}
        },
    },
    response: {
        200: {
            type: 'object',
            properties: {
                accessToken: { type: 'string' },
                refreshToken: { type: 'string' },
                expiresIn: { type: 'number' },
                message: { type: 'string' }
            },
        },
        401: {
            type: 'object',
            properties: {
                message: { type: 'string' }
            }
        },
        423: {
            type: 'object',
            properties: {
                message: { type: 'string' }
            }
        }
    }
};

export const RefreshTokenSchema = {
    body: {
        type: 'object',
        required: ['refreshToken'],
        properties: {
            refreshToken: { type: 'string' }
        },
    },
    response: {
        200: {
            type: 'object',
            properties: {
                accessToken: { type: 'string' },
                refreshToken: { type: 'string' },
                expiresIn: { type: 'number' },
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
};

export const LogoutUserSchema = {
    headers: {
        type: 'object',
        required: ['authorization'],
        properties: {
            authorization: { type: 'string' }
        },
    },
    body: {
        type: 'object',
        required: ['refreshToken'],
        properties: {
            refreshToken: { type: 'string' }
        },
    },
    response: {
        200: {
            type: 'object',
            properties: {
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
};