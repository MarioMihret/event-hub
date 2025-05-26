import { NextResponse } from 'next/server';
import { logger } from './logger';

interface CacheOptions {
  /** Cache duration in seconds */
  maxAge?: number;
  /** Revalidation period in seconds */
  staleWhileRevalidate?: number;
  /** Whether to disable caching completely */
  noCache?: boolean;
  /** Whether the response is immutable */
  immutable?: boolean;
}

interface ResponseOptions {
  /** Status code */
  status?: number;
  /** Cache options */
  cache?: CacheOptions;
  /** Custom headers */
  headers?: Record<string, string>;
  /** Debug information */
  includeDebug?: boolean;
}

/**
 * Create an optimized API response with proper caching headers
 */
export function createApiResponse(
  data: any, 
  options: ResponseOptions = {}
) {
  const {
    status = 200,
    cache = { maxAge: 60, staleWhileRevalidate: 300 },
    headers = {},
    includeDebug = false
  } = options;
  
  // Add performance timing to response in development only
  const responseData = { ...data };
  
  // Add debug info if requested and in development
  if (includeDebug && process.env.NODE_ENV !== 'production') {
    responseData.debug = {
      timestamp: new Date().toISOString(),
      env: process.env.NODE_ENV,
      ...(responseData.debug || {})
    };
  }
  
  // Build cache control header
  let cacheControl = '';
  
  if (cache.noCache) {
    cacheControl = 'no-cache, no-store, must-revalidate';
  } else if (cache.immutable) {
    cacheControl = `public, max-age=${cache.maxAge || 31536000}, immutable`;
  } else {
    cacheControl = `public, max-age=${cache.maxAge || 60}`;
    
    if (cache.staleWhileRevalidate) {
      cacheControl += `, stale-while-revalidate=${cache.staleWhileRevalidate}`;
    }
  }
  
  // Combine headers
  const responseHeaders = {
    'Cache-Control': cacheControl,
    ...headers
  };
  
  return NextResponse.json(responseData, {
    status,
    headers: responseHeaders
  });
}

/**
 * Create an error response
 */
export function createErrorResponse(
  error: string | Error, 
  status = 500,
  additionalData: Record<string, any> = {},
  customHeaders: Record<string, string> = {}
) {
  // Log error if not in production
  if (process.env.NODE_ENV !== 'production') {
    logger.error('API Error:', error instanceof Error ? error : new Error(error as string));
  }
  
  const errorMessage = error instanceof Error ? error.message : error;
  
  return NextResponse.json(
    { 
      success: false, 
      error: errorMessage,
      ...additionalData
    },
    { 
      status,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        ...customHeaders
      }
    }
  );
}

/**
 * Measure API performance
 */
export function measureApiPerformance<T>(
  fn: () => Promise<T>,
  apiName: string
): Promise<T> {
  const startTime = Date.now();
  
  return fn().then(result => {
    const duration = Date.now() - startTime;
    logger.apiRequest(apiName, startTime);
    return result;
  }).catch(error => {
    const duration = Date.now() - startTime;
    logger.error(`${apiName} failed after ${duration}ms`, error);
    throw error;
  });
}