import { useSession } from 'next-auth/react';
import { useState, useEffect, useRef } from 'react';
import type { UseSessionOptions } from 'next-auth/react';

// Constants
const SESSION_CACHE_KEY = 'cached_session';
const SESSION_TTL_MS = 15 * 60 * 1000; // 15 minutes instead of 10

/**
 * Custom hook for optimized session access with client-side caching
 * to reduce the number of /api/auth/session calls
 */
export default function useSessionWithCache(options: UseSessionOptions<boolean> = { required: false }) {
  const { data: session, status, update } = useSession(options);
  const [cachedSession, setCachedSession] = useState<any>(null);
  const sessionCheckedRef = useRef(false);
  
  // On first mount, try to load from cache immediately
  useEffect(() => {
    if (typeof window !== 'undefined' && !sessionCheckedRef.current) {
      try {
        const cachedSessionData = sessionStorage.getItem(SESSION_CACHE_KEY);
        
        if (cachedSessionData) {
          const { data, expires } = JSON.parse(cachedSessionData);
          
          // Only use the cached data if it hasn't expired
          if (expires > Date.now()) {
            setCachedSession(data);
            sessionCheckedRef.current = true;
          } else {
            // Clear expired data
            sessionStorage.removeItem(SESSION_CACHE_KEY);
          }
        }
      } catch (error) {
        console.error('Failed to read cached session:', error);
      }
    }
  }, []);
  
  // On successful authentication, update cache
  useEffect(() => {
    if (status === 'authenticated' && session) {
      // Only store in sessionStorage if we're in a browser environment
      if (typeof window !== 'undefined') {
        try {
          // Create session cache with TTL
          const expiry = Date.now() + SESSION_TTL_MS;
          const sessionData = {
            data: session,
            expires: expiry
          };
          
          // Store in sessionStorage (will be cleared when the tab is closed)
          sessionStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(sessionData));
          setCachedSession(session);
        } catch (error) {
          console.error('Failed to cache session:', error);
        }
      }
    } else if (status === 'unauthenticated') {
      // Clear the cache if user is not authenticated
      if (typeof window !== 'undefined') {
        try {
          sessionStorage.removeItem(SESSION_CACHE_KEY);
          setCachedSession(null);
        } catch (error) {
          console.error('Failed to clear session cache:', error);
        }
      }
    }
  }, [session, status]);
  
  // Return the session from the cache if it's available and we're still loading
  // Otherwise return the session from useSession
  return {
    data: (status === 'loading' && cachedSession) ? cachedSession : session,
    status: (status === 'loading' && cachedSession) ? 'authenticated' : status,
    update
  };
} 