import { FastifyPluginAsync } from 'fastify';
import { RegisterUserSchema, LoginUserSchema, RefreshTokenSchema, LogoutUserSchema } from '../schemas/auth.schema';
import { registerUserHandler, loginUserHandler, refreshTokenHandler, logoutUserHandler } from '../handlers/auth.handlers';

const authRoutes: FastifyPluginAsync = async (fastify) => {
    fastify.post('/auth/register', { schema: RegisterUserSchema }, registerUserHandler);
    fastify.post('/auth/login',    { schema: LoginUserSchema },    loginUserHandler);
    fastify.post('/auth/refresh',  { schema: RefreshTokenSchema }, refreshTokenHandler);
    fastify.post('/auth/logout',   { schema: LogoutUserSchema },   logoutUserHandler);
};

export default authRoutes;
