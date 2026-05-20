const ROUTE_TO_PERMISSION_CODE_MAP = [
    // ---- Protected Routes only ----

    // Users
    { method: 'GET',    path: '/users',     permissionCode: 'user:list' },
    { method: 'GET',    path: '/users/:id', permissionCode: 'user:read' },
    { method: 'PUT',    path: '/users/:id', permissionCode: 'user:update' },
    { method: 'DELETE', path: '/users/:id', permissionCode: 'user:delete' },

    // Roles
    { method: 'GET',    path: '/roles',                       permissionCode: 'role:list' },
    { method: 'GET',    path: '/roles/:id',                   permissionCode: 'role:read' },
    { method: 'POST',   path: '/roles',                       permissionCode: 'role:create' },
    { method: 'PUT',    path: '/roles/:id',                   permissionCode: 'role:update' },
    { method: 'DELETE', path: '/roles/:id',                   permissionCode: 'role:delete' },
    { method: 'POST',   path: '/roles/:id/permissions',       permissionCode: 'role:assign_permission' },
    { method: 'DELETE', path: '/roles/:id/permissions',       permissionCode: 'role:remove_permission' },

    // Permissions
    { method: 'GET',    path: '/permissions',     permissionCode: 'permission:list' },
    { method: 'POST',   path: '/permissions',     permissionCode: 'permission:create' },
    { method: 'DELETE', path: '/permissions/:id', permissionCode: 'permission:delete' },

    // User roles
    { method: 'GET',    path: '/user-roles/:userId', permissionCode: 'user_role:read' },
    { method: 'POST',   path: '/user-roles',         permissionCode: 'user_role:assign' },
    { method: 'DELETE', path: '/user-roles',          permissionCode: 'user_role:remove' },

    // User permissions
    { method: 'GET',    path: '/user-permissions/:userId', permissionCode: 'user_permission:read' },
    { method: 'POST',   path: '/user-permissions',         permissionCode: 'user_permission:assign' },
    { method: 'DELETE', path: '/user-permissions/:id',     permissionCode: 'user_permission:remove' },

    // Temp permissions
    { method: 'GET',    path: '/temp-permissions/:userId',         permissionCode: 'temp_permission:read' },
    { method: 'POST',   path: '/temp-permissions',                  permissionCode: 'temp_permission:create' },
    { method: 'DELETE', path: '/temp-permissions/:id',              permissionCode: 'temp_permission:delete' },
    { method: 'DELETE', path: '/temp-permissions/by-link/:linkedTo', permissionCode: 'temp_permission:delete' },

    // Maps
    { method: 'GET',    path: '/maps/:id/download', permissionCode: 'map:download' },
    { method: 'PUT',    path: '/maps/:id/validate', permissionCode: 'map:validate' },
    { method: 'PUT',    path: '/maps/:id/revoke',   permissionCode: 'map:revoke' },
    { method: 'GET',    path: '/maps',              permissionCode: 'map:list' },
    { method: 'GET',    path: '/maps/:id',          permissionCode: 'map:read' },
    { method: 'POST',   path: '/maps',              permissionCode: 'map:create' },
    { method: 'PUT',    path: '/maps/:id',          permissionCode: 'map:update' },
    { method: 'DELETE', path: '/maps/:id',          permissionCode: 'map:delete' },

    // Vehicles
    { method: 'GET',    path: '/vehicles',     permissionCode: 'vehicle:list' },
    { method: 'GET',    path: '/vehicles/:id', permissionCode: 'vehicle:read' },
    { method: 'POST',   path: '/vehicles',     permissionCode: 'vehicle:create' },
    { method: 'PUT',    path: '/vehicles/:id', permissionCode: 'vehicle:update' },
    { method: 'DELETE', path: '/vehicles/:id', permissionCode: 'vehicle:delete' },

    // Client vehicles
    { method: 'GET',    path: '/client-vehicles',     permissionCode: 'client_vehicle:list' },
    { method: 'GET',    path: '/client-vehicles/:id', permissionCode: 'client_vehicle:read' },
    { method: 'POST',   path: '/client-vehicles',     permissionCode: 'client_vehicle:create' },
    { method: 'PUT',    path: '/client-vehicles/:id', permissionCode: 'client_vehicle:update' },
    { method: 'DELETE', path: '/client-vehicles/:id', permissionCode: 'client_vehicle:delete' },

    // Interventions
    { method: 'PUT',    path: '/interventions/:id/close',  permissionCode: 'intervention:close' },
    { method: 'POST',   path: '/interventions/:id/assign', permissionCode: 'intervention:assign' },
    { method: 'GET',    path: '/interventions',             permissionCode: 'intervention:list' },
    { method: 'GET',    path: '/interventions/:id',         permissionCode: 'intervention:read' },
    { method: 'POST',   path: '/interventions',             permissionCode: 'intervention:create' },
    { method: 'PUT',    path: '/interventions/:id',         permissionCode: 'intervention:update' },
    { method: 'DELETE', path: '/interventions/:id',         permissionCode: 'intervention:delete' },

    // Sites
    { method: 'GET',    path: '/sites',     permissionCode: 'site:list' },
    { method: 'GET',    path: '/sites/:id', permissionCode: 'site:read' },
    { method: 'POST',   path: '/sites',     permissionCode: 'site:create' },
    { method: 'PUT',    path: '/sites/:id', permissionCode: 'site:update' },
    { method: 'DELETE', path: '/sites/:id', permissionCode: 'site:delete' },

    // Telemetry
    { method: 'GET',    path: '/telemetry',     permissionCode: 'telemetry:list' },
    { method: 'GET',    path: '/telemetry/:id', permissionCode: 'telemetry:read' },
    { method: 'POST',   path: '/telemetry',     permissionCode: 'telemetry:create' },
];

type RoutePermissionEntry = {
    method: string;
    path: string;
    permissionCode: string;
};

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

const ROUTE_INDEX = buildRouteIndex(ROUTE_TO_PERMISSION_CODE_MAP as RoutePermissionEntry[]);