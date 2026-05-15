import type { FastifyRequest, FastifyReply, HookHandlerDoneFunction } from 'fastify';
import type { Logger } from './logger.js';

export interface AuditAction {
  action: string;
  resource: string;
  resourceId?: string;
  userId?: string;
  sensitive: boolean;
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

export function createAuditLogger(logger: Logger) {
  return {
    log(audit: AuditAction) {
      const logEntry = {
        audit: true,
        action: audit.action,
        resource: audit.resource,
        resourceId: audit.resourceId,
        userId: audit.userId,
        sensitive: audit.sensitive,
        ...audit.metadata,
      };

      if (audit.sensitive) {
        logger.warn(logEntry, `AUDIT [SENSITIVE] ${audit.action} on ${audit.resource}`);
      } else {
        logger.info(logEntry, `AUDIT ${audit.action} on ${audit.resource}`);
      }
    },
  };
}

export type AuditLogger = ReturnType<typeof createAuditLogger>;
