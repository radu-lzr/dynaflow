interface MinimalLogger {
  info(obj: object, msg: string): void;
  warn(obj: object, msg: string): void;
}

export interface AuditAction {
  action: string;
  resource: string;
  resourceId?: string;
  userId?: string;
  sensitive?: boolean;
  metadata?: Record<string, unknown>;
}

const SENSITIVE_PATTERNS: RegExp[] = [
  /^map:(download|create|update|delete|validate|revoke)$/,
  /^permission:(assign|update|delete)$/,
  /^role:(create|update|delete)$/,
  /^user:(create|delete)$/,
];

export function isSensitiveAction(action: string): boolean {
  return SENSITIVE_PATTERNS.some((pattern) => pattern.test(action));
}

export function createAuditLogger(logger: MinimalLogger) {
  return {
    log(audit: AuditAction) {
      const sensitive = audit.sensitive ?? isSensitiveAction(audit.action);

      const logEntry = {
        audit: true,
        action: audit.action,
        resource: audit.resource,
        resourceId: audit.resourceId,
        userId: audit.userId,
        sensitive,
        ...audit.metadata,
      };

      if (sensitive) {
        logger.warn(logEntry, `AUDIT [SENSITIVE] ${audit.action} on ${audit.resource}`);
      } else {
        logger.info(logEntry, `AUDIT ${audit.action} on ${audit.resource}`);
      }
    },
  };
}

export type AuditLogger = ReturnType<typeof createAuditLogger>;