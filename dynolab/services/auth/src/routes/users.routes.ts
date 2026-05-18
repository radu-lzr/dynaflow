import type { FastifyInstance } from 'fastify';
import { GetUsersSchema, GetUserByIdSchema, UpdateUserSchema, DeleteUserSchema } from '../schemas/users.schema';
import { getUsersHandler, getUserByIdHandler, updateUserHandler, deleteUserHandler } from '../handlers/users.handlers';

export async function usersRoutes(fastify: FastifyInstance) {
    fastify.get('/users',      { schema: GetUsersSchema },     getUsersHandler);
    fastify.get('/users/:id',  { schema: GetUserByIdSchema },  getUserByIdHandler);
    fastify.put('/users/:id',  { schema: UpdateUserSchema },   updateUserHandler);
    fastify.delete('/users/:id', { schema: DeleteUserSchema }, deleteUserHandler);
}
