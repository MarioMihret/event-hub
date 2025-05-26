import { useSession } from 'next-auth/react';
import { useState, useCallback, useEffect } from 'react';

// Define proper types for subscription-related data
interface SubscriptionFeatures {
  maxEvents: number;
  maxAttendeesPerEvent: number;
  maxFileUploads: number;
  maxImageSize: number;
  maxVideoLength: number;
  customDomain: boolean;
  allowsAnalytics: boolean;
  allowsCustomization: boolean;
  supportLevel: string;
  eventTypes: string[];
}

interface SubscriptionResponse {
  success: boolean;
  hasSubscription: boolean;
  plan: string | null;
  expiresAt: string | null;
  status: string;
  isExpiringSoon: boolean;
  daysRemaining: number | null;
  trialUsed: boolean;
  planInfo?: {
    limits?: {
      maxEvents?: number;
      maxAttendeesPerEvent?: number;
      maxFileUploads?: number;
      maxImageSize?: number;
      maxVideoLength?: number;
      customDomain?: boolean;
      analytics?: string;
      support?: string;
      eventTypes?: string[];
    };
  };
  activeSubscription?: {
    id: string;
    planId: string;
    startDate: string;
    endDate: string;
    status: string;
  };
}

interface SubscriptionStatus {
  checked: boolean;
  isValid: boolean;
  lastChecked: number;
  type?: string;
  expiresAt?: string;
  daysRemaining?: number | null;
  isExpiringSoon?: boolean;
  features: SubscriptionFeatures;
  cacheKey?: string;
}

// Default subscription features
const defaultSubscriptionFeatures: SubscriptionFeatures = {
  maxEvents: 2,
  maxAttendeesPerEvent: 50,
  maxFileUploads: 3,
  maxImageSize: 5,
  maxVideoLength: 0,
  customDomain: false,
  allowsAnalytics: false,
  allowsCustomization: false,
  supportLevel: 'email',
  eventTypes: ['basic']
};

// Cache duration in milliseconds
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Custom hook for checking subscription status
 * Provides caching and error handling for subscription checks
 */
const useSubscriptionCheck = () => {
  const { data: session } = useSession();
  const [isCheckingSubscription, setIsCheckingSubscription] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>({
    checked: false,
    isValid: false,
    lastChecked: 0,
    features: { ...defaultSubscriptionFeatures }
  });
  
  // Generate a cache key based on session
  const getCacheKey = useCallback(() => {
    if (!session?.user?.id) return null;
    return `subscription_${session.user.id}`;
  }, [session?.user?.id]);
  
  // Load from cache on initial mount
  useEffect(() => {
    const cacheKey = getCacheKey();
    if (!cacheKey) return;
    
    try {
      const cachedData = localStorage.getItem(cacheKey);
      if (cachedData) {
        const parsed = JSON.parse(cachedData) as SubscriptionStatus;
        
        // Only use cache if it's fresh
        if (Date.now() - parsed.lastChecked < CACHE_DURATION) {
          setSubscriptionStatus(parsed);
        }
      }
    } catch (error) {
      console.error('Error loading subscription data from cache:', error);
      // If there's an error, clear the cache
      localStorage.removeItem(cacheKey);
    }
  }, [getCacheKey]);
  
  // Extract features from API response
  const extractFeatures = useCallback((data: SubscriptionResponse): SubscriptionFeatures => {
    // Start with defaults
    const features = { ...defaultSubscriptionFeatures };
    
    // Extract from planInfo if available
    if (data.planInfo?.limits) {
      const limits = data.planInfo.limits;
      
      // Handle maxEvents - use -1 for unlimited
      if (limits.maxEvents !== undefined) {
        features.maxEvents = limits.maxEvents === -1 ? Infinity : limits.maxEvents;
      }
      
      // Handle maxAttendeesPerEvent - use -1 for unlimited
      if (limits.maxAttendeesPerEvent !== undefined) {
        features.maxAttendeesPerEvent = limits.maxAttendeesPerEvent === -1 
          ? Infinity 
          : limits.maxAttendeesPerEvent;
      }
      
      // Extract other numeric limits
      if (limits.maxFileUploads !== undefined) {
        features.maxFileUploads = limits.maxFileUploads === -1 ? Infinity : limits.maxFileUploads;
      }
      
      if (limits.maxImageSize !== undefined) {
        features.maxImageSize = limits.maxImageSize;
      }
      
      if (limits.maxVideoLength !== undefined) {
        features.maxVideoLength = limits.maxVideoLength;
      }
      
      // Extract boolean features
      if (limits.customDomain !== undefined) {
        features.customDomain = limits.customDomain;
      }
      
      // Map analytics level to boolean
      if (limits.analytics) {
        features.allowsAnalytics = limits.analytics !== 'none';
      }
      
      // Extract support level
      if (limits.support) {
        features.supportLevel = limits.support;
      }
      
      // Extract event types
      if (limits.eventTypes) {
        features.eventTypes = [...limits.eventTypes];
      }
      
      // Determine if customization is allowed (based on plan level)
      features.allowsCustomization = limits.analytics === 'advanced' || limits.analytics === 'enterprise';
    }
    
    return features;
  }, []);
  
  /**
   * Check subscription status with the API
   * @param forceBypass - Whether to bypass the check and assume valid
   * @param forceRefresh - Whether to force a refresh from the server
   * @returns Boolean indicating if subscription is valid
   */
  const checkSubscriptionDirectly = useCallback(async (
    forceBypass = false, 
    forceRefresh = false
  ): Promise<boolean> => {
    // If we're forcing bypass, return true
    if (forceBypass) {
      const bypassStatus: SubscriptionStatus = {
        checked: true,
        isValid: true,
        lastChecked: Date.now(),
        type: 'bypass',
        features: { ...defaultSubscriptionFeatures }
      };
      
      setSubscriptionStatus(bypassStatus);
      
      // Also store in cache
      const cacheKey = getCacheKey();
      if (cacheKey) {
        localStorage.setItem(cacheKey, JSON.stringify(bypassStatus));
      }
      
      return true;
    }
    
    // Check cache if we're not forcing a refresh
    if (!forceRefresh) {
      const now = Date.now();
      if (subscriptionStatus.checked && now - subscriptionStatus.lastChecked < CACHE_DURATION) {
        return subscriptionStatus.isValid;
      }
    }
    
    // Can't check without a session and the correct ID
    if (!session?.user?.id || !session?.user?.email) {
      console.warn("[useSubscriptionCheck] Cannot check subscription without valid session user ID and email.");
      return false;
    }
    
    try {
      setIsCheckingSubscription(true);
      
      // Call API to check subscription
      const response = await fetch('/api/subscriptions/check', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
        body: JSON.stringify({ 
          userId: session.user.id,
          _forceRefresh: forceRefresh
        })
      });
      
      // Handle error responses
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error('[useSubscriptionCheck] Error response from API:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        
        setSubscriptionStatus(prevStatus => ({
          ...prevStatus,
          checked: true,
          isValid: false,
          lastChecked: Date.now(),
          features: prevStatus.features
        }));
        return false;
      }
      
      // Parse response
      const data = await response.json() as SubscriptionResponse;
      
      // Check if response is properly formed
      if (data === null || typeof data !== 'object') {
        console.error('[useSubscriptionCheck] Invalid response format:', data);
        return false;
      }
      
      // Determine if subscription is valid
      const isValid = data.hasSubscription === true && 
                      data.status === 'active' && 
                      data.expiresAt && 
                      new Date(data.expiresAt) > new Date();
      
      // Extract features
      const features = extractFeatures(data);
      
      // Create updated status
      const updatedStatus: SubscriptionStatus = {
        checked: true,
        isValid,
        lastChecked: Date.now(),
        type: data.plan || undefined,
        expiresAt: data.expiresAt || undefined,
        daysRemaining: data.daysRemaining,
        isExpiringSoon: data.isExpiringSoon,
        features,
        cacheKey: getCacheKey() || undefined
      };
      
      // Update state
      setSubscriptionStatus(updatedStatus);
      
      // Store in local storage for caching
      const cacheKey = getCacheKey();
      if (cacheKey) {
        try {
          localStorage.setItem(cacheKey, JSON.stringify(updatedStatus));
        } catch (error) {
          console.error('Error caching subscription data:', error);
        }
      }
      
      return isValid;
    } catch (error) {
      console.error('[useSubscriptionCheck] Error checking subscription:', error);
      
      // In case of errors, don't assume valid, but retain current features
      setSubscriptionStatus(prevStatus => ({
        ...prevStatus,
        checked: true,
        isValid: false,
        lastChecked: Date.now(),
        features: prevStatus.features
      }));
      return false;
    } finally {
      setIsCheckingSubscription(false);
    }
  }, [session, getCacheKey, extractFeatures]);

  return { 
    checkSubscriptionDirectly, 
    isCheckingSubscription, 
    subscriptionStatus,
    
    // Additional helper getters
    isSubscriptionValid: subscriptionStatus.isValid,
    subscriptionType: subscriptionStatus.type,
    subscriptionFeatures: subscriptionStatus.features,
    
    // Helper for checking feature limits
    hasFeature: (feature: keyof SubscriptionFeatures) => 
      !!subscriptionStatus.features[feature],
    
    // Helper for checking numeric limits
    getLimit: (limit: keyof SubscriptionFeatures) => 
      subscriptionStatus.features[limit],
      
    // Helper for checking if subscription is expiring soon  
    isExpiringSoon: subscriptionStatus.isExpiringSoon || false,
    
    // Days remaining in subscription
    daysRemaining: subscriptionStatus.daysRemaining || 0
  };
}

export default useSubscriptionCheck;