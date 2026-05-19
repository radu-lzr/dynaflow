import { FastifyRequest, FastifyReply } from 'fastify';
import { FromSchema } from 'json-schema-to-ts';
import { CheckAccessSchema } from '../schemas/check.schema';
import { getPermissionCodeForRoute as resolvePermission } from '../utils/routes-to-perm-code';
import { checkPermission } from '../utils/permission-checker';

type CheckAccessBody = FromSchema<typeof CheckAccessSchema.body>;

export async function checkAccessHandler(
    request: FastifyRequest<{ Body: CheckAccessBody }>,
    reply: FastifyReply
) {
    try {
        const { userId, method, path, resourceId } = request.body;

        const permissionCode = resolvePermission(method, path);
        if (!permissionCode) {
            return reply.code(403).send({ message: 'Unknown or unprotected route' });
        }

        const result = await checkPermission(request.server.pg, userId, permissionCode, resourceId);

        if (result.allowed) {
            return reply.code(200).send({ allowed: true, scopes: result.scopes, message: 'Allowed' });
        }

        return reply.code(403).send({ message: 'Forbidden' });
    } catch (error) {
        request.log.error(error, 'Error checking permission');
        return reply.code(500).send({ message: 'Internal Server Error' });
    }
}
