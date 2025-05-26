/**
 * Session Cache Utility
 * 
 * This utility provides in-memory caching for session data to reduce
 * the number of database queries when checking authentication status.
 */

interface CachedSession {
  data: any;
  expiresAt: number;
}

// Cache storage - this will be in memory on the server
// const sessionCache = new Map<string, CachedSession>(); // Commented out due to multi-instance incompatibility

// Default TTL for cache entries (5 minutes)
// const DEFAULT_CACHE_TTL = 5 * 60 * 1000; // Commented out

/**
 * Get a session from the cache
 * @param key - The session identifier key
 * @returns The cached session data or null if not in cache/expired
 */
export function getSessionFromCache(key: string): any | null {
  // const cached = sessionCache.get(key); // Commented out
  // if (!cached) return null;
  //
  // // Check if the cache entry has expired
  // if (Date.now() > cached.expiresAt) {
  //   sessionCache.delete(key);
  //   return null;
  // }
  //
  // return cached.data;
  return null; // Cache is effectively disabled
}

/**
 * Store a session in the cache
 * @param key - The session identifier key
 * @param data - The session data to cache
 * @param ttl - Time to live in milliseconds (defaults to 5 minutes)
 */
export function setSessionInCache(key: string, data: any, ttl?: number): void { // ttl made optional, DEFAULT_CACHE_TTL commented out
  // sessionCache.set(key, { // Commented out
  //   data,
  //   expiresAt: Date.now() + (ttl || DEFAULT_CACHE_TTL) // Use provided ttl or old default
  // });
  // Cache is effectively disabled
}

/**
 * Remove a session from the cache
 * @param key - The session identifier key
 */
export function removeSessionFromCache(key: string): void {
  // sessionCache.delete(key); // Commented out
  // Cache is effectively disabled
}

/**
 * Clear all expired sessions from the cache
 */
export function cleanExpiredSessions(): void {
  // const now = Date.now(); // Commented out
  // for (const [key, value] of sessionCache.entries()) {
  //   if (now > value.expiresAt) {
  //     sessionCache.delete(key);
  //   }
  // }
  // Cache is effectively disabled
}

// Run cache cleanup every minute
// if (typeof setInterval !== 'undefined') { // Commented out
//   setInterval(cleanExpiredSessions, 60 * 1000);
// } 