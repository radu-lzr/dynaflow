import type { Pool } from '@dynolab/core';

interface CheckResult {
    allowed: boolean;
    scopes: string[] | null;
}

export async function checkPermission(
    pool: Pool,
    userId: string,
    code: string,
    resourceId?: string
): Promise<CheckResult> {

    // Level 1: role-based permissions
    const roleResult = await pool.query(`
        SELECT ur.site_id
        FROM user_roles ur
        JOIN role_permissions rp ON ur.role_id = rp.role_id
        JOIN permissions p ON rp.permission_id = p.id
        WHERE ur.user_id = $1 AND p.code = $2
    `, [userId, code]);

    if ((roleResult.rowCount ?? 0) > 0) {
        const hasGlobal = roleResult.rows.some(row => row.site_id === null);
        if (hasGlobal) {
            return { allowed: true, scopes: null };
        }
        const siteIds = roleResult.rows.map(row => row.site_id);
        return { allowed: true, scopes: siteIds };
    }

    // Level 2: direct user permissions
    const directResult = await pool.query(`
        SELECT resource_id
        FROM user_permissions
        WHERE user_id = $1 AND permission = $2
        AND ($3::uuid IS NULL OR resource_id = $3)
    `, [userId, code, resourceId || null]);

    if ((directResult.rowCount ?? 0) > 0) {
        return { allowed: true, scopes: null };
    }

    // Level 3: temporary permissions
    const tempResult = await pool.query(`
        SELECT resource_id
        FROM temp_permissions
        WHERE user_id = $1 AND permission = $2
        AND ($3::uuid IS NULL OR resource_id = $3)
        AND expires_at > NOW()
    `, [userId, code, resourceId || null]);

    if ((tempResult.rowCount ?? 0) > 0) {
        return { allowed: true, scopes: null };
    }

    return { allowed: false, scopes: null };
}