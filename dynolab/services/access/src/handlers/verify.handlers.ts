import { FastifyRequest, FastifyReply } from 'fastify';
import { FromSchema } from 'json-schema-to-ts';
import { VerifyAccessSchema } from '../schemas/verify.schema';
import { getPermissionCodeForRoute } from '../utils/routes-to-perm-code';
import { checkPermission } from '../utils/permission-checker';

type VerifyHeaders = FromSchema<typeof VerifyAccessSchema.headers>;

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:4001';

function stripGatewayPrefix(uri: string): string {
    // Strip the first two path segments (/api/<service-name>) from the original URI.
    // e.g. /api/site/sites/123 -> /sites/123
    //      /api/access/roles   -> /roles
    const withoutQuery = uri.split('?')[0];
    const segments = withoutQuery.split('/').filter(Boolean);
    const stripped = segments.slice(2);
    return stripped.length === 0 ? '/' : '/' + stripped.join('/');
}

export async function verifyAccessHandler(
    request: FastifyRequest<{ Headers: VerifyHeaders }>,
    reply: FastifyReply
) {
    try {
        const authHeader = request.headers['authorization'];
        const originalUri = request.headers['x-original-uri'] as string;
        const originalMethod = (request.headers['x-original-method'] as string).toUpperCase();

        // Verify JWT with the auth service
        const authRes = await fetch(`${AUTH_SERVICE_URL}/auth/verify`, {
            method: 'POST',
            headers: { Authorization: authHeader },
        });

        if (authRes.status === 401) {
            return reply.code(401).send({ message: 'Unauthorized' });
        }
        if (!authRes.ok) {
            request.log.error({ status: authRes.status }, 'Auth service error during verify');
            return reply.code(401).send({ message: 'Unauthorized' });
        }

        const { userId, accountType } = await authRes.json() as {
            userId: string;
            accountType: string;
        };

        // Resolve permission code from the original route
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

    } catch (error) {
        request.log.error(error, 'Error in access verify');
        return reply.code(500).send({ message: 'Internal Server Error' });
    }
}
