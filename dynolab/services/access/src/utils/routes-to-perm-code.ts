export type RoutePermissionEntry = {
    method: string;
    path: string;
    permissionCode: string;
    description: string;
};

export type PermissionEntry = {
    permissionCode: string;
    description: string;
};

// Permissions that exist but have no gateway route (e.g. handled internally or reserved).
export const EXTRA_PERMISSIONS: PermissionEntry[] = [
    { permissionCode: 'user:create',    description: 'Create users' },
    { permissionCode: 'monitoring:read', description: 'Read monitoring dashboards' },
];

export const ROUTE_TO_PERMISSION_CODE_MAP: RoutePermissionEntry[] = [
    // ---- Protected Routes only ----

    // Users
    { method: 'GET',    path: '/users',     permissionCode: 'user:read',   description: 'Read users' },
    { method: 'GET',    path: '/users/:id', permissionCode: 'user:read',   description: 'Read users' },
    { method: 'PUT',    path: '/users/:id', permissionCode: 'user:update', description: 'Update users' },
    { method: 'DELETE', path: '/users/:id', permissionCode: 'user:delete', description: 'Delete users' },

    // Roles
    { method: 'GET',    path: '/roles',                  permissionCode: 'role:read',         description: 'Read roles' },
    { method: 'GET',    path: '/roles/:id',              permissionCode: 'role:read',         description: 'Read roles' },
    { method: 'POST',   path: '/roles',                  permissionCode: 'role:create',       description: 'Create roles' },
    { method: 'PUT',    path: '/roles/:id',              permissionCode: 'role:update',       description: 'Update roles' },
    { method: 'DELETE', path: '/roles/:id',              permissionCode: 'role:delete',       description: 'Delete roles' },
    { method: 'POST',   path: '/roles/:id/permissions',  permissionCode: 'permission:assign', description: 'Assign permissions to users' },
    { method: 'DELETE', path: '/roles/:id/permissions',  permissionCode: 'permission:assign', description: 'Assign permissions to users' },

    // Permissions
    { method: 'GET',    path: '/permissions',     permissionCode: 'permission:assign', description: 'Assign permissions to users' },
    { method: 'POST',   path: '/permissions',     permissionCode: 'permission:assign', description: 'Assign permissions to users' },
    { method: 'DELETE', path: '/permissions/:id', permissionCode: 'permission:assign', description: 'Assign permissions to users' },

    // User roles
    { method: 'GET',    path: '/user-roles/:userId', permissionCode: 'role:read',         description: 'Read roles' },
    { method: 'POST',   path: '/user-roles',         permissionCode: 'permission:assign', description: 'Assign permissions to users' },
    { method: 'DELETE', path: '/user-roles',         permissionCode: 'permission:assign', description: 'Assign permissions to users' },

    // User permissions
    { method: 'GET',    path: '/user-permissions/:userId', permissionCode: 'permission:assign', description: 'Assign permissions to users' },
    { method: 'POST',   path: '/user-permissions',         permissionCode: 'permission:assign', description: 'Assign permissions to users' },
    { method: 'DELETE', path: '/user-permissions/:id',     permissionCode: 'permission:assign', description: 'Assign permissions to users' },

    // Temp permissions
    { method: 'GET',    path: '/temp-permissions/:userId',          permissionCode: 'permission:assign', description: 'Assign permissions to users' },
    { method: 'POST',   path: '/temp-permissions',                  permissionCode: 'permission:assign', description: 'Assign permissions to users' },
    { method: 'DELETE', path: '/temp-permissions/:id',              permissionCode: 'permission:assign', description: 'Assign permissions to users' },
    { method: 'DELETE', path: '/temp-permissions/by-link/:linkedTo', permissionCode: 'permission:assign', description: 'Assign permissions to users' },

    // Maps — lifecycle actions first (before generic /:id)
    { method: 'PUT',    path: '/maps/:id/develop',                        permissionCode: 'map:update',   description: 'Update maps' },
    { method: 'PUT',    path: '/maps/:id/redevelop',                      permissionCode: 'map:update',   description: 'Update maps' },
    { method: 'PUT',    path: '/maps/:id/validate',                       permissionCode: 'map:validate', description: 'Mark a map as validated' },
    { method: 'PUT',    path: '/maps/:id/revoke',                         permissionCode: 'map:revoke',   description: 'Revoke a map' },
    { method: 'GET',    path: '/maps/:id/versions/:versionId/download',   permissionCode: 'map:download', description: 'Download map binary files' },
    { method: 'GET',    path: '/maps/:id/versions',                       permissionCode: 'map:read',     description: 'Read maps' },
    { method: 'POST',   path: '/maps/:id/versions',                       permissionCode: 'map:create',   description: 'Create maps' },
    { method: 'DELETE', path: '/maps/:id/versions/:versionId',            permissionCode: 'map:delete',   description: 'Delete maps' },
    { method: 'GET',    path: '/maps/:id/configs',                        permissionCode: 'map:read',     description: 'Read maps' },
    { method: 'POST',   path: '/maps/:id/configs',                        permissionCode: 'map:update',   description: 'Update maps' },
    { method: 'DELETE', path: '/maps/:id/configs/:configId',              permissionCode: 'map:update',   description: 'Update maps' },
    // Maps — generic CRUD
    { method: 'GET',    path: '/maps',     permissionCode: 'map:read',   description: 'Read maps' },
    { method: 'GET',    path: '/maps/:id', permissionCode: 'map:read',   description: 'Read maps' },
    { method: 'POST',   path: '/maps',     permissionCode: 'map:create', description: 'Create maps' },
    { method: 'PUT',    path: '/maps/:id', permissionCode: 'map:update', description: 'Update maps' },
    { method: 'DELETE', path: '/maps/:id', permissionCode: 'map:delete', description: 'Delete maps' },

    // Vehicle configs
    { method: 'GET',    path: '/vehicles',      permissionCode: 'vehicle_config:read',   description: 'Read vehicle configurations' },
    { method: 'GET',    path: '/vehicles/tags', permissionCode: 'vehicle_config:read',   description: 'Read vehicle configurations' },
    { method: 'GET',    path: '/vehicles/:id',  permissionCode: 'vehicle_config:read',   description: 'Read vehicle configurations' },
    { method: 'POST',   path: '/vehicles',      permissionCode: 'vehicle_config:create', description: 'Create vehicle configurations' },
    { method: 'PUT',    path: '/vehicles/:id',  permissionCode: 'vehicle_config:update', description: 'Update vehicle configurations' },
    { method: 'DELETE', path: '/vehicles/:id',  permissionCode: 'vehicle_config:delete', description: 'Delete vehicle configurations' },

    // Client vehicles — modifications before generic /:id
    { method: 'GET',    path: '/client-vehicles/:vehicleId/modifications',      permissionCode: 'client_vehicle:read',   description: 'Read client vehicles' },
    { method: 'POST',   path: '/client-vehicles/:vehicleId/modifications',      permissionCode: 'client_vehicle:update', description: 'Update client vehicles' },
    { method: 'DELETE', path: '/client-vehicles/:vehicleId/modifications/:id',  permissionCode: 'client_vehicle:update', description: 'Update client vehicles' },
    // Client vehicles — generic CRUD
    { method: 'GET',    path: '/client-vehicles',     permissionCode: 'client_vehicle:read',   description: 'Read client vehicles' },
    { method: 'GET',    path: '/client-vehicles/:id', permissionCode: 'client_vehicle:read',   description: 'Read client vehicles' },
    { method: 'POST',   path: '/client-vehicles',     permissionCode: 'client_vehicle:create', description: 'Create client vehicles' },
    { method: 'PUT',    path: '/client-vehicles/:id', permissionCode: 'client_vehicle:update', description: 'Update client vehicles' },
    { method: 'DELETE', path: '/client-vehicles/:id', permissionCode: 'client_vehicle:delete', description: 'Delete client vehicles' },

    // Interventions — lifecycle actions first (before generic /:id)
    { method: 'PUT',  path: '/interventions/:id/start',         permissionCode: 'intervention:update', description: 'Update interventions' },
    { method: 'PUT',  path: '/interventions/:id/complete',      permissionCode: 'intervention:close',  description: 'Close an intervention' },
    { method: 'PUT',  path: '/interventions/:id/deliver',       permissionCode: 'intervention:close',  description: 'Close an intervention' },
    { method: 'PUT',  path: '/interventions/:id/assign',        permissionCode: 'intervention:assign', description: 'Assign technician to an intervention' },
    { method: 'POST', path: '/interventions/:id/bench-session', permissionCode: 'telemetry:create',    description: 'Create bench sessions and datapoints' },
    // Interventions — generic CRUD
    { method: 'GET',    path: '/interventions',     permissionCode: 'intervention:read',   description: 'Read interventions' },
    { method: 'GET',    path: '/interventions/:id', permissionCode: 'intervention:read',   description: 'Read interventions' },
    { method: 'POST',   path: '/interventions',     permissionCode: 'intervention:create', description: 'Create interventions' },
    { method: 'PUT',    path: '/interventions/:id', permissionCode: 'intervention:update', description: 'Update interventions' },
    { method: 'DELETE', path: '/interventions/:id', permissionCode: 'intervention:delete', description: 'Delete interventions' },

    // Sites — equipment and members before generic /:id
    { method: 'GET',    path: '/sites/:siteId/equipment',       permissionCode: 'site:read',   description: 'Read sites' },
    { method: 'POST',   path: '/sites/:siteId/equipment',       permissionCode: 'site:update', description: 'Update sites' },
    { method: 'GET',    path: '/sites/:siteId/equipment/:id',   permissionCode: 'site:read',   description: 'Read sites' },
    { method: 'PUT',    path: '/sites/:siteId/equipment/:id',   permissionCode: 'site:update', description: 'Update sites' },
    { method: 'DELETE', path: '/sites/:siteId/equipment/:id',   permissionCode: 'site:update', description: 'Update sites' },
    { method: 'GET',    path: '/sites/:siteId/members',         permissionCode: 'site:read',   description: 'Read sites' },
    { method: 'POST',   path: '/sites/:siteId/members',         permissionCode: 'site:update', description: 'Update sites' },
    { method: 'DELETE', path: '/sites/:siteId/members/:userId', permissionCode: 'site:update', description: 'Update sites' },
    // Sites — generic CRUD
    { method: 'GET',    path: '/sites',     permissionCode: 'site:read',   description: 'Read sites' },
    { method: 'GET',    path: '/sites/:id', permissionCode: 'site:read',   description: 'Read sites' },
    { method: 'POST',   path: '/sites',     permissionCode: 'site:create', description: 'Create sites' },
    { method: 'PUT',    path: '/sites/:id', permissionCode: 'site:update', description: 'Update sites' },
    { method: 'DELETE', path: '/sites/:id', permissionCode: 'site:delete', description: 'Delete sites' },

    // Bench sessions (Telemetry service) — sub-routes before generic /:id
    { method: 'GET',    path: '/bench-sessions/compare',                  permissionCode: 'telemetry:read',   description: 'Read bench sessions and datapoints' },
    { method: 'GET',    path: '/bench-sessions/:sessionId/datapoints',    permissionCode: 'telemetry:read',   description: 'Read bench sessions and datapoints' },
    { method: 'POST',   path: '/bench-sessions/:sessionId/datapoints',    permissionCode: 'telemetry:create', description: 'Create bench sessions and datapoints' },
    { method: 'DELETE', path: '/bench-sessions/:sessionId/datapoints',    permissionCode: 'telemetry:delete', description: 'Delete bench sessions and datapoints' },
    { method: 'GET',    path: '/bench-sessions/:sessionId/obd-logs',      permissionCode: 'telemetry:read',   description: 'Read bench sessions and datapoints' },
    { method: 'POST',   path: '/bench-sessions/:sessionId/obd-logs',      permissionCode: 'telemetry:create', description: 'Create bench sessions and datapoints' },
    { method: 'DELETE', path: '/bench-sessions/:sessionId/obd-logs',      permissionCode: 'telemetry:delete', description: 'Delete bench sessions and datapoints' },
    // Bench sessions — generic CRUD
    { method: 'GET',    path: '/bench-sessions',     permissionCode: 'telemetry:read',   description: 'Read bench sessions and datapoints' },
    { method: 'GET',    path: '/bench-sessions/:id', permissionCode: 'telemetry:read',   description: 'Read bench sessions and datapoints' },
    { method: 'POST',   path: '/bench-sessions',     permissionCode: 'telemetry:create', description: 'Create bench sessions and datapoints' },
    { method: 'PUT',    path: '/bench-sessions/:id', permissionCode: 'telemetry:update', description: 'Update bench sessions' },
    { method: 'DELETE', path: '/bench-sessions/:id', permissionCode: 'telemetry:delete', description: 'Delete bench sessions and datapoints' },
];

type RouteIndex = Record<string, Record<string, RoutePermissionEntry[]>>;

function normalizePath(p: string) {
    if (!p) return '';
    // Remove query string and hash fragment
    let np = p.split('?')[0].split('#')[0];
    // Remove trailing slash except for root '/'
    if (np.length > 1 && np.endsWith('/')) {
        np = np.slice(0, -1);
    }
    return np;
}

function getRootKey(path: string): string {
    const segments = path.split('/').filter(Boolean);
    return segments.length === 0 ? '/' : `/${segments[0]}`;
}

function buildRouteIndex(routes: RoutePermissionEntry[]): RouteIndex {
    return routes.reduce<RouteIndex>((index, route) => {
        const method = route.method.toUpperCase();
        const normalizedRoute = normalizePath(route.path);
        const rootKey = getRootKey(normalizedRoute);
        const firstSegment = normalizedRoute.split('/').filter(Boolean)[0] ?? '';
        const bucketKey = firstSegment.startsWith(':') ? '*' : rootKey;

        if (!index[method]) {
            index[method] = Object.create(null) as Record<string, RoutePermissionEntry[]>;
        }

        if (!index[method][bucketKey]) {
            index[method][bucketKey] = [];
        }

        index[method][bucketKey].push(route);
        return index;
    }, Object.create(null) as RouteIndex);
}

function matchPath(routePath: string, requestPath: string): boolean {
    const normalizedRoute = normalizePath(routePath);
    const routeSegments = normalizedRoute.split('/').filter(Boolean);
    const requestSegments = requestPath.split('/').filter(Boolean);

    if (routeSegments.length !== requestSegments.length) {
        return false;
    }

    for (let i = 0; i < routeSegments.length; i++) {
        const rSeg = routeSegments[i];
        const qSeg = requestSegments[i];
        if (rSeg.startsWith(':')) {
            continue; // This is a path parameter, so it matches anything
        }
        if (rSeg !== qSeg) {
            return false; // Segment does not match
        }
    }

    return true; // All segments match
}

export function getPermissionCodeForRoute(method: string, path: string): string | null {
    const normalizedMethod = (method || '').toUpperCase();
    const normalizedRequest = normalizePath(path);
    const requestRootKey = getRootKey(normalizedRequest);
    const methodIndex = ROUTE_INDEX[normalizedMethod];

    if (!methodIndex) {
        return null;
    }

    const candidates = [
        ...(methodIndex[requestRootKey] ?? []),
        ...(methodIndex['*'] ?? []),
    ];

    const route = candidates.find(r => matchPath(r.path, normalizedRequest));
    return route ? route.permissionCode : null;
}

const ROUTE_INDEX = buildRouteIndex(ROUTE_TO_PERMISSION_CODE_MAP);
