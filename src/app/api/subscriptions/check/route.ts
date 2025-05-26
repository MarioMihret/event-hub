import { NextRequest, NextResponse } from "next/server";
import { getCollection } from "@/lib/mongodb";
import { MONGODB } from "@/constants/auth";
import { logger } from "@/utils/logger";
import { createApiResponse, createErrorResponse, measureApiPerformance } from "@/utils/apiUtils";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { ObjectId } from "mongodb";

// Use an in-memory cache to avoid frequent database lookups
const subscriptionCache = new Map<string, { data: any, timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minute cache

export async function POST(request: NextRequest) {
  return measureApiPerformance(async () => {
    try {
      const requestStart = Date.now();
      
      // Check for cache control headers from client
      const requestHeaders = new Headers(request.headers);
      const noCache = 
        requestHeaders.get('Cache-Control')?.includes('no-cache') || 
        requestHeaders.get('Pragma')?.includes('no-cache');
      
      // Parse request body
      const body = await request.json();
      const { email, tx_ref, userId, _forceRefresh } = body;
      
      // Determine if we should bypass cache
      const shouldBypassCache = _forceRefresh === true || noCache === true;
      
      logger.info(`Checking subscription for: ${JSON.stringify({ 
        email, 
        tx_ref, 
        userId, 
        _forceRefresh,
        bypassCache: shouldBypassCache,
        noCache
      })}`);
      
      // Get session for authentication check
      const session = await getServerSession(authOptions);
      const sessionUserId = session?.user?.id;
      
      if (!email && !userId && !sessionUserId) {
        return createErrorResponse("Email or userId is required", 400);
      }
      
      // Use session userId if none provided
      const effectiveUserId = userId || sessionUserId;
      
      // Validate that we have a user identifier - safeguard against null/undefined
      if (!effectiveUserId && !email && !tx_ref) {
        logger.error("No valid user identifier provided for subscription check");
        return createErrorResponse("No valid user identifier provided", 400);
      }
      
      logger.info(`Using effective userId: ${effectiveUserId || 'none, using email or tx_ref instead'}`);
      
      // Generate cache key based on available identifiers
      const cacheKey = tx_ref 
        ? `subscription_tx_${tx_ref}` 
        : effectiveUserId 
          ? `subscription_user_${effectiveUserId}` 
          : `subscription_email_${email}`;
      
      // Check cache first if not explicitly forcing refresh
      if (!shouldBypassCache) {
        const cached = subscriptionCache.get(cacheKey);
        if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
          logger.info(`Using cached subscription data for key: ${cacheKey}`);
          return createApiResponse(cached.data, {
            headers: {
              'X-Cache': 'HIT',
              'X-Cache-Timestamp': cached.timestamp.toString(),
              'X-Cache-Age': (Date.now() - cached.timestamp).toString()
            }
          });
        } else if (cached) {
          logger.info(`Cache expired for key: ${cacheKey}, fetching fresh data`);
        }
      } else {
        logger.info(`Bypassing cache for key: ${cacheKey} due to explicit request`);
      }
      
      // Get the collections
      const [subscriptionsCollection, usersCollection, planDefinitionsCollection] = await Promise.all([
        getCollection(MONGODB.collections.subscriptions),
        getCollection(MONGODB.collections.users),
        getCollection('planDefinitions')
      ]);
      
      // If tx_ref is provided, check specific transaction
      if (tx_ref) {
        const subscription = await subscriptionsCollection.findOne({
          $or: [
            { transactionRef: tx_ref },
            { txRef: tx_ref },
            { tx_ref: tx_ref }
          ]
        });
        
        if (!subscription) {
          return createErrorResponse("Subscription not found", 404);
        }
        
        const response = {
          success: true,
          status: subscription.status,
          receiptData: {
            transactionId: subscription.transactionRef || tx_ref,
            date: subscription.createdAt,
            plan: subscription.planId,
            amount: subscription.amount,
            currency: subscription.currency || 'ETB',
            customerEmail: email,
            expiryDate: subscription.expiryDate || subscription.endDate,
            paymentStatus: subscription.paymentStatus
          }
        };
        
        // Cache the result, even if we bypassed the cache for reading
        subscriptionCache.set(cacheKey, { 
          data: response, 
          timestamp: Date.now() 
        });
        
        // Log response time
        const requestDuration = Date.now() - requestStart;
        logger.info(`Subscription check completed in ${requestDuration}ms`);
        
        return createApiResponse(response, {
          headers: {
            'X-Cache': 'MISS',
            'X-Cache-Refreshed': Date.now().toString(),
            'X-Request-Duration': requestDuration.toString()
          },
          cache: {
            maxAge: 60,
            staleWhileRevalidate: 300
          }
        });
      }
      
      // Find user if only email is provided but not userId
      let finalUserId = effectiveUserId;
      let finalUserObjectId = null;
      
      if (email && !finalUserId) {
        const user = await usersCollection.findOne({ email });
        if (user) {
          finalUserId = user._id.toString();
          logger.info(`Found userId ${finalUserId} for email ${email}`);
        }
      }
      
      // Convert userId string to ObjectId if available
      if (finalUserId && ObjectId.isValid(finalUserId)) {
        finalUserObjectId = new ObjectId(finalUserId);
      }
      
      logger.info(`Checking subscription for userId: ${finalUserId || 'not available'} and email: ${email || 'not available'}`);
      
      // Build query to look up subscriptions by userId or email
      const query: Record<string, any> = {};
      if (finalUserObjectId) {
        query.userId = finalUserObjectId;
      } else if (finalUserId) {
        // Try string userId as fallback
        query.userId = finalUserId;
      } else if (email) {
        query.email = email;
      } else {
        return createErrorResponse("Invalid request parameters - need userId or email", 400);
      }
      
      // Ensure we convert to proper Date objects for comparison
      const currentDate = new Date();
      logger.info(`Current date for comparison: ${currentDate.toISOString()}`);
      
      // Get all subscriptions for this user
      const subscriptions = await subscriptionsCollection.find(query)
        .sort({ createdAt: -1 })
        .toArray();
      
      logger.info(`Found ${subscriptions.length} total subscriptions for query ${JSON.stringify(query)}`);
      
      // Find active subscriptions - ensure date comparisons work correctly
      const activeSubscriptions = subscriptions.filter(sub => {
        if (!sub.status || sub.status !== 'active') return false;
        if (!sub.endDate) return false;
        
        const endDate = new Date(sub.endDate);
        return endDate > currentDate;
      });
      
      // Find trial subscriptions
      const trialSubscription = subscriptions.find(sub => 
        sub.planId === 'trial'
      );
      
      // Check if user has any active subscription
      const activeSubscription = activeSubscriptions.length > 0 ? activeSubscriptions[0] : null;
      
      // Calculate subscription analytics
      const subscriptionAnalytics = {
        activeSubscription: !!activeSubscription,
        totalSubscriptions: subscriptions.length,
        activeCount: activeSubscriptions.length,
        expiredCount: subscriptions.filter(s => {
          if (!s.endDate) return true; // Treat as expired if no end date
          return s.status !== 'active' || new Date(s.endDate) <= currentDate;
        }).length,
        trialUsed: !!trialSubscription,
        history: subscriptions.map(s => ({
          id: s._id.toString(),
          planId: s.planId,
          status: s.status,
          startDate: s.startDate,
          endDate: s.endDate
        }))
      };
      
      // If we have an active subscription, get the plan details
      let planDetails = null;
      if (activeSubscription) {
        const planIdForLookup = activeSubscription.planId;
        logger.info(`Active subscription found. Plan ID for lookup: '${planIdForLookup}'`);
        
        planDetails = await planDefinitionsCollection.findOne({ slug: planIdForLookup });
        
        if (planDetails) {
          logger.info(`Successfully fetched plan details for '${planIdForLookup}'`);
        } else {
          logger.warn(`Plan details not found for planId: '${planIdForLookup}'`);
        }
      }
      
      // Provide default plan details if we couldn't find real ones but have a subscription
      if (activeSubscription && !planDetails) {
        logger.warn(`Creating default plan info for ${activeSubscription.planId}`);
        const defaultLimits = {
          maxEvents: activeSubscription.planId === 'trial' ? 2 : 
                     activeSubscription.planId === 'basic' ? 10 : 
                     activeSubscription.planId === 'premium' ? 50 : 5,
          maxAttendeesPerEvent: activeSubscription.planId === 'premium' ? 500 : 100,
          maxFileUploads: 10,
          maxImageSize: 10,
          maxVideoLength: 5,
          customDomain: activeSubscription.planId === 'premium',
          analytics: activeSubscription.planId === 'premium' ? 'advanced' : 'basic',
          support: activeSubscription.planId === 'premium' ? 'priority' : 'email',
          eventTypes: activeSubscription.planId === 'premium' ? 
                     ['basic', 'advanced', 'premium'] : 
                     ['basic']
        };
        
        planDetails = {
          slug: activeSubscription.planId,
          name: `${activeSubscription.planId.charAt(0).toUpperCase()}${activeSubscription.planId.slice(1)} Plan`,
          limits: defaultLimits
        };
      }
      
      // Determine if subscription is expiring soon (within 7 days)
      let isExpiringSoon = false;
      let daysRemaining = 0;
      
      if (activeSubscription && activeSubscription.endDate) {
        const expiryDate = new Date(activeSubscription.endDate);
        const today = new Date();
        const timeDiff = expiryDate.getTime() - today.getTime();
        daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24));
        isExpiringSoon = daysRemaining <= 7;
        
        logger.info(`Subscription expiry: ${expiryDate.toISOString()}, days remaining: ${daysRemaining}, expiring soon: ${isExpiringSoon}`);
      }
      
      // Prepare response
      const response = {
        success: true,
        hasSubscription: !!activeSubscription,
        plan: activeSubscription?.planId || null,
        expiresAt: activeSubscription?.endDate || null,
        status: activeSubscription?.status || 'inactive',
        trialUsed: !!trialSubscription,
        isExpiringSoon: isExpiringSoon,
        daysRemaining: activeSubscription ? daysRemaining : null,
        planInfo: planDetails,
        activeSubscription: activeSubscription ? {
          id: activeSubscription._id.toString(),
          transactionId: activeSubscription.transactionRef,
          planId: activeSubscription.planId,
          startDate: activeSubscription.startDate,
          endDate: activeSubscription.endDate,
          status: activeSubscription.status,
          amount: activeSubscription.amount,
          currency: activeSubscription.currency,
          paymentStatus: activeSubscription.paymentStatus
        } : null
      };
      
      // Cache the result, even if we bypassed the cache for reading
      subscriptionCache.set(cacheKey, { 
        data: response, 
        timestamp: Date.now() 
      });
      
      // Log response time
      const requestDuration = Date.now() - requestStart;
      logger.info(`Subscription check completed in ${requestDuration}ms`);
      
      return createApiResponse(response, {
        headers: {
          'X-Cache': 'MISS',
          'X-Cache-Refreshed': Date.now().toString(),
          'X-Request-Duration': requestDuration.toString()
        },
        cache: {
          maxAge: 60,
          staleWhileRevalidate: 300
        }
      });
      
    } catch (error) {
      logger.error("Error checking subscription:", error);
      return createErrorResponse("Failed to check subscription status", 500);
    }
  }, "Check Subscription API");
}

// Helper function to verify payment with Chapa
async function verifyPayment(tx_ref: string) {
  try {
    const response = await fetch(
      `https://api.chapa.co/v1/transaction/verify/${tx_ref}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.CHAPA_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Payment verification failed: ${response.statusText}`);
    }

    const data = await response.json();
    console.log("Force refreshed subscription check result:", data);
    
    // Format subscription status consistently
    if (data?.hasSubscription === true && data?.activeSubscription?.status) {
      // Normalize status to lowercase
      data.status = data.activeSubscription.status.toLowerCase();
      console.log(`Normalized subscription status to: ${data.status}`);
    }
    
    return NextResponse.json({
      hasSubscription: data.hasSubscription,
      plan: data.plan,
      expiresAt: data.expiresAt,
      status: data.status,
      trialUsed: data.trialUsed,
      activeSubscription: data.activeSubscription
    });
  } catch (error) {
    console.error('Error verifying payment:', error);
    throw error;
  }
} 