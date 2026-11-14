/**
 * Structured JSON logging with requestId support.
 */

export interface LogContext {
  requestId?: string;
  address?: string;
  [key: string]: unknown;
}

export const logger = {
  info(message: string, context: LogContext = {}) {
    console.log(
      JSON.stringify({
        level: "INFO",
        timestamp: new Date().toISOString(),
        message,
        ...context,
      })
    );
  },

  warn(message: string, context: LogContext = {}) {
    console.warn(
      JSON.stringify({
        level: "WARN",
        timestamp: new Date().toISOString(),
        message,
        ...context,
      })
    );
  },

  error(message: string, error?: unknown, context: LogContext = {}) {
    const errorDetails =
      error instanceof Error
        ? { errorName: error.name, errorMessage: error.message, stack: error.stack }
        : { errorMessage: String(error) };

    console.error(
      JSON.stringify({
        level: "ERROR",
        timestamp: new Date().toISOString(),
        message,
        ...errorDetails,
        ...context,
      })
    );
  },
};
