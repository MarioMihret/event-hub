"use client";
import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { User } from 'next-auth';
// import { checkInGroup } from '@/lib/utils/userUtils'; // Removed as userUtils.ts was deleted and checkInGroup was not implemented

interface SubscriptionStatus {
  hasSubscription: boolean;
  isActive: boolean;
  plan?: string;
  expiresAt?: string | null;
  lastChecked: number;
}

interface UserContextType {
  user: User | null;
  isLoading: boolean;
  isOrganizer: boolean;
  hasValidSubscription: boolean;
  subscriptionDetails: SubscriptionStatus | null;
  refreshSubscription: () => Promise<SubscriptionStatus | null>;
  error: string | null;
  refreshUser: () => Promise<void>;
  checkSubscription: () => Promise<SubscriptionStatus | null>;
}

const defaultSubscriptionStatus: SubscriptionStatus = {
  hasSubscription: false,
  isActive: false,
  plan: null,
  expiresAt: null,
  lastChecked: 0
};

const UserContext = createContext<UserContextType>({
  user: null,
  isLoading: true,
  isOrganizer: false,
  hasValidSubscription: false,
  subscriptionDetails: null,
  refreshSubscription: async () => null,
  error: null,
  refreshUser: async () => {},
  checkSubscription: async () => null
});

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const { data: session, status } = useSession();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isOrganizer, setIsOrganizer] = useState<boolean>(false);
  const [hasValidSubscription, setHasValidSubscription] = useState<boolean>(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);
  const CACHE_DURATION = 30000; // 30 seconds cache
  const [error, setError] = useState<string | null>(null);

  // Memoize checkSubscription to prevent it from changing on each render
  const checkSubscription = useCallback(async (forceRefresh = false): Promise<SubscriptionStatus | null> => {
    const authenticatedUser = session?.user as User;
    // @ts-expect-error _id is a custom property we know exists on our augmented User type
    if (!authenticatedUser?._id) {
      return null;
    }

    try {
      // Check cache first if not forcing refresh
      if (!forceRefresh && subscriptionStatus && (Date.now() - subscriptionStatus.lastChecked < 5 * 60 * 1000)) {
        console.log('[UserProvider] Using cached subscription status');
        return subscriptionStatus;
      }

      console.log('[UserProvider] Fetching fresh subscription status');
      const response = await fetch('/api/subscriptions/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        },
        body: JSON.stringify({
          // @ts-expect-error _id is a custom property we know exists on our augmented User type
          userId: authenticatedUser._id,
          _forceRefresh: forceRefresh
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to check subscription: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('[UserProvider] Subscription check result:', data);

      // Format the status object
      const formattedStatus: SubscriptionStatus = {
        hasSubscription: !!data.hasSubscription,
        isActive: !!data.hasSubscription && data.status === 'active',
        plan: data.plan || null,
        expiresAt: data.expiresAt || null,
        lastChecked: Date.now()
      };

      // Update state
      setSubscriptionStatus(formattedStatus);
      
      return formattedStatus;
    } catch (error) {
      console.error('[UserProvider] Error checking subscription:', error);
      setError(error instanceof Error ? error.message : 'Failed to check subscription status');
      return null;
    }
  }, [session?.user, subscriptionStatus]);

  // Memoize fetchUserData to prevent it from changing on each render
  const fetchUserData = useCallback(async () => {
    // Skip if session is still loading or not authenticated
    if (status === 'loading') {
      return;
    }
    
    // Get session user with User type
    const authenticatedUser = session?.user as User;
    // @ts-expect-error _id is a custom property we know exists on our augmented User type
    if (!authenticatedUser?._id) {
      setIsLoading(false);
      return;
    }

    // Check if cache is still valid
    const now = Date.now();
    const cacheIsValid = now - lastFetchTime < CACHE_DURATION && user !== null;
    
    if (cacheIsValid) {
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/profile`);
      if (!res.ok) throw new Error('Failed to fetch user data');
      
      const data = await res.json();
      
      if (data.success && data.data) {
        const fetchedUser = data.data as User;
        setUser(fetchedUser); 
        
        setIsOrganizer(fetchedUser?.role === 'organizer');
        
        // Call checkSubscription to get status from API
        const subStatus = await checkSubscription(); 
        // Update hasValidSubscription based on the API check result
        setHasValidSubscription(subStatus?.isActive ?? false);

        } else {
         throw new Error(data.error || 'User data not found in profile response');
      }
      
      // Update the last fetch time
      setLastFetchTime(now);
    } catch (error) {
      console.error('[UserProvider] Error fetching user data:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch user profile');
      // Still try to check subscription directly if profile fetch fails
      const subStatus = await checkSubscription(); 
      setHasValidSubscription(subStatus?.isActive ?? false);
    } finally {
      setIsLoading(false);
    }
  }, [session?.user, lastFetchTime, user, CACHE_DURATION, checkSubscription, status]);

  useEffect(() => {
    // Only fetch user data when session is authenticated and not currently loading
    if (status === 'loading') return;
    
    if (status === 'authenticated') {
      fetchUserData();
    } else {
      setUser(null);
      setIsLoading(false);
      setIsOrganizer(false);
      setHasValidSubscription(false);
    }
  }, [status, fetchUserData]);

  const value: UserContextType = {
    user,
    isLoading,
    isOrganizer,
    hasValidSubscription,
    subscriptionDetails: subscriptionStatus,
    refreshSubscription: (forceRefresh = true) => checkSubscription(forceRefresh),
    error,
    refreshUser: fetchUserData,
    checkSubscription
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext); 