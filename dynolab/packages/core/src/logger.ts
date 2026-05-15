import pino from 'pino';

export interface LoggerOptions {
  service: string;
  level?: string;
}

export function createLogger(options: LoggerOptions) {
  return pino({
    name: options.service,
    level: options.level || process.env.LOG_LEVEL || 'info',
    formatters: {
      level(label) {
        return { level: label };
      },
    },
    timestamp: pino.stdTimeFunctions.isoTime,
  });
}

export type Logger = ReturnType<typeof createLogger>;
