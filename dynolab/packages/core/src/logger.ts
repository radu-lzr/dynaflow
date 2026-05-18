import pino from 'pino';

export interface LoggerOptions {
  service: string;
  level?: string;
}

export function getLoggerOptions(options: LoggerOptions) {
  return {
    name: options.service,
    level: options.level || process.env.LOG_LEVEL || 'info',
    formatters: {
      level(label: string) {
        return { level: label };
      },
    },
    timestamp: pino.stdTimeFunctions.isoTime,
  };
}

export function createLogger(options: LoggerOptions) {
  return pino(getLoggerOptions(options));
}

export type Logger = ReturnType<typeof createLogger>;