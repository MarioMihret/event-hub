/**
 * Enhanced logger utility with structured logging support
 * Optimized for both development and production environments
 */

// Environment configuration
const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = process.env.NODE_ENV === 'development';
const LOG_LEVEL = process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug');

// Log level hierarchy
const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  none: 4
};

// Performance metrics collection
type Metric = {
  count: number;
  totalTime: number;
  lastTime?: number;
  min?: number;
  max?: number;
};

const metrics: Record<string, Metric> = {};

// Type definitions for structured logging
type LogPayload = Record<string, any>;
type LoggerFunction = (message: string, payload?: LogPayload) => void;

export interface ILogger {
  debug: LoggerFunction;
  info: LoggerFunction;
  warn: LoggerFunction;
  error: LoggerFunction;
  apiRequest: (endpoint: string, startTime: number, payload?: LogPayload) => void;
  startTime: (label: string) => number;
  endTime: (label: string, startTime: number) => number;
  getMetrics: () => Array<{
    label: string;
    count: number;
    totalTime: number;
    avgTime: number;
    min?: number;
    max?: number;
  }>;
}

/**
 * Formats a log message with optional structured data
 */
function formatLog(level: string, message: string, payload?: LogPayload): string {
  const timestamp = new Date().toISOString();
  const formattedMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  
  if (payload) {
    try {
      const payloadStr = JSON.stringify(payload);
      return `${formattedMessage} ${payloadStr}`;
    } catch (err) {
      return `${formattedMessage} [Error serializing payload]`;
    }
  }
  
  return formattedMessage;
}

/**
 * Checks if the given log level should be displayed
 */
function shouldLog(level: keyof typeof LOG_LEVELS): boolean {
  const configuredLevel = LOG_LEVELS[LOG_LEVEL as keyof typeof LOG_LEVELS] ?? LOG_LEVELS.info;
  return LOG_LEVELS[level] >= configuredLevel;
}

export const logger: ILogger = {
  /**
   * Log debug message (only in lower environments and if log level permits)
   */
  debug: (message: string, payload?: LogPayload) => {
    if (shouldLog('debug')) {
      console.debug(formatLog('debug', message, payload));
    }
  },
  
  /**
   * Log info message (if log level permits)
   */
  info: (message: string, payload?: LogPayload) => {
    if (shouldLog('info')) {
      console.log(formatLog('info', message, payload));
    }
  },
  
  /**
   * Log warning message (always logged unless level is explicitly 'error' or 'none')
   */
  warn: (message: string, payload?: LogPayload) => {
    if (shouldLog('warn')) {
      console.warn(formatLog('warn', message, payload));
    }
  },
  
  /**
   * Log error message (always logged unless level is 'none')
   * Supports passing an Error object as payload
   */
  error: (message: string, error?: Error | any) => {
    if (shouldLog('error')) {
      let payload: LogPayload | undefined;
      
      if (error) {
        if (error instanceof Error) {
          payload = {
            name: error.name,
            message: error.message,
            stack: isProduction ? undefined : error.stack
          };
        } else {
          payload = { error };
        }
      }
      
      console.error(formatLog('error', message, payload));
    }
  },
  
  /**
   * Log API request with timing
   */
  apiRequest: (endpoint: string, startTime: number, payload?: LogPayload) => {
    if (shouldLog('info')) {
      const duration = Date.now() - startTime;
      logger.info(`API ${endpoint} - ${duration}ms`, { 
        duration, 
        endpoint,
        ...payload
      });
    }
  },
  
  /**
   * Start timing an operation for performance tracking
   */
  startTime: (label: string): number => {
    return Date.now();
  },
  
  /**
   * End timing and record metrics
   */
  endTime: (label: string, startTime: number) => {
    const duration = Date.now() - startTime;
    
    if (!metrics[label]) {
      metrics[label] = { count: 0, totalTime: 0 };
    }
    
    const metric = metrics[label];
    metric.count++;
    metric.totalTime += duration;
    metric.lastTime = duration;
    
    // Track min and max durations
    if (metric.min === undefined || duration < metric.min) {
      metric.min = duration;
    }
    if (metric.max === undefined || duration > metric.max) {
      metric.max = duration;
    }
    
    if (shouldLog('debug')) {
      logger.debug(`⏱️ ${label}: ${duration}ms`);
    }
    
    return duration;
  },
  
  /**
   * Get performance metrics
   */
  getMetrics: () => {
    return Object.entries(metrics).map(([label, data]) => ({
      label,
      count: data.count,
      totalTime: data.totalTime,
      avgTime: data.totalTime / data.count,
      min: data.min,
      max: data.max
    }));
  }
};

// Default export for easier importing
export default logger; 