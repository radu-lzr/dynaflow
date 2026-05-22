import type { FastifyBaseLogger } from 'fastify';

const ACCESS_URL = process.env.ACCESS_SERVICE_URL || 'http://localhost:4002';
const TELEMETRY_URL = process.env.TELEMETRY_SERVICE_URL || 'http://localhost:4008';

export async function createTempPermission(
    technicianId: string,
    mapId: string,
    interventionId: string,
    actorUserId: string,
    log: FastifyBaseLogger,
): Promise<void> {
    try {
        await fetch(`${ACCESS_URL}/temp-permissions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-User-Id': actorUserId },
            body: JSON.stringify({
                userId: technicianId,
                permissionCode: 'map:download',
                resourceId: mapId,
                linkedTo: interventionId,
                ttlSeconds: 259200,
            }),
        });
    } catch (error) {
        log.warn({ err: error }, 'Failed to create temp permission — continuing without it');
    }
}

export async function deleteTempPermissions(
    interventionId: string,
    actorUserId: string,
    log: FastifyBaseLogger,
): Promise<void> {
    try {
        await fetch(`${ACCESS_URL}/temp-permissions/by-link/${interventionId}`, {
            method: 'DELETE',
            headers: { 'X-User-Id': actorUserId },
        });
    } catch (error) {
        log.warn({ err: error }, 'Failed to delete temp permissions — continuing');
    }
}

export async function createBenchSession(
    interventionId: string,
    type: 'before' | 'after',
    benchId: string | null,
    notes: string | null,
    actorUserId: string,
    log: FastifyBaseLogger,
): Promise<string | null> {
    const response = await fetch(`${TELEMETRY_URL}/bench-sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-Id': actorUserId },
        body: JSON.stringify({
            interventionId,
            type,
            ...(benchId !== null && { benchId }),
            ...(notes !== null && { notes }),
            startedAt: new Date().toISOString(),
        }),
    });
    if (!response.ok) {
        log.error({ status: response.status }, 'Telemetry Service returned non-OK response');
        return null;
    }
    const data = await response.json() as { id: string };
    return data.id;
}
