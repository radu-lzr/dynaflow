import { FastifyRequest, FastifyReply } from 'fastify';
import { FromSchema } from 'json-schema-to-ts';
import { VerifyAccessSchema } from '../schemas/verify.schema';
import { getPermissionCodeForRoute } from '../utils/routes-to-perm-code';
import { checkPermission } from '../utils/permission-checker';

type VerifyHeaders = FromSchema<typeof VerifyAccessSchema.headers>;

function stripGatewayPrefix(uri: string): string {
    const withoutQuery = uri.split('?')[0];
    const segments = withoutQuery.split('/').filter(Boolean);
    const stripped = segments.slice(2);
    return stripped.length === 0 ? '/' : '/' + stripped.join('/');
}

export async function verifyAccessHandler(
    request: FastifyRequest<{ Headers: VerifyHeaders }>,
    reply: FastifyReply
) {
    const userId = request.headers['x-user-id'] as string;
    const accountType = (request.headers['x-account-type'] as string | undefined) ?? '';
    const originalUri = request.headers['x-original-uri'] as string;
    const originalMethod = (request.headers['x-original-method'] as string).toUpperCase();

    const servicePath = stripGatewayPrefix(originalUri);
    const permissionCode = getPermissionCodeForRoute(originalMethod, servicePath);
    if (!permissionCode) {
        return reply.code(403).send({ message: 'Unknown or unprotected route' });
    }

    const result = await checkPermission(request.server.pg, userId, permissionCode);

    if (!result.allowed) {
        return reply.code(403).send({ message: 'Forbidden' });
    }

    reply.header('X-User-Id', userId);
    reply.header('X-Account-Type', accountType);
    return reply.code(200).send({ allowed: true, message: 'Allowed' });
}
