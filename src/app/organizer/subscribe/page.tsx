"use client";
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Check, Loader2, AlertCircle, Building2, Clock, CreditCard, BadgeDollarSign, CheckCircle, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';

interface Feature {
  id: string;
  name: string;
  description: string;
  included: boolean;
}

interface Limits {
  maxEvents: number;
  maxAttendeesPerEvent: number;
  maxFileUploads: number;
  maxImageSize: number; // Assuming in MB
  maxVideoLength: number; // Assuming in minutes
  customDomain: boolean;
  analytics: string; // 'basic', 'advanced', etc.
  support: string; // 'email', 'priority', etc.
  eventTypes: string[];
}

interface Metadata {
  isPopular?: boolean;
  isTrial?: boolean;
  isEnterpriseFlag?: boolean; // Renamed from isEnterprise to avoid conflict with a potential top-level field
}

interface Plan {
  _id: string; // MongoDB ObjectId as string
  slug: string;
  name: string;
  price: number | string; // Keep as number or string for 'Custom'
  durationDays?: number; // From the example, trial has durationDays
  duration?: string; // For display like '1 month', '1 year', kept for compatibility if needed
  description: string; // This was in the old interface, might need to be added to PlanDefinition or derived
  features: Feature[];
  limits: Limits;
  displayOrder?: number;
  isActive?: boolean;
  metadata?: Metadata;
  // Retain fields from old interface that might still be used in the component,
  // or ensure they are handled if removed.
  isTrial?: boolean; // This was in the old Plan, now in metadata.isTrial
  isPopular?: boolean; // This was in the old Plan, now in metadata.isPopular
  isEnterprise?: boolean; // This was in the old Plan, now in metadata.isEnterpriseFlag
}

interface SubscriptionStatus {
  hasSubscription: boolean;
  plan?: string;
  expiresAt?: string;
  status?: string;
  isExpiringSoon?: boolean;
  daysRemaining?: number;
  trialUsed?: boolean;
}

function NoiseBackground() {
  return (
    <div className="fixed top-0 left-0 w-full h-full -z-10 pointer-events-none opacity-20">
      <div className="absolute inset-0 bg-gradient-to-br from-black via-[#120a19] to-black"></div>
      <div className="absolute inset-0 bg-[url('/noise.png')] opacity-5 mix-blend-overlay"></div>
    </div>
  );
}

function SubscribePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status: sessionStatus } = useSession();
  const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentSubscription, setCurrentSubscription] = useState<SubscriptionStatus | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);
  const [showEnterpriseForm, setShowEnterpriseForm] = useState(false);
  const [refreshingStatus, setRefreshingStatus] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [refreshComplete, setRefreshComplete] = useState<boolean>(false);
  const [refreshSuccess, setRefreshSuccess] = useState<boolean>(false);
  const [enterpriseForm, setEnterpriseForm] = useState({
    companyName: '',
    email: '',
    phone: '',
    message: ''
  });
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(true);

  // Function to verify organizer status
  const checkOrganizerStatus = async () => {
    if (!session?.user?.email) return;
    
    try {
      const response = await fetch('/api/organizer-applications/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: session.user.email })
      });
      
      const data = await response.json();
      
      if (!data.success || data.error) {
        // User doesn't have an approved application
        console.error("User is not an approved organizer:", data.error);
        setError("You must be an approved organizer to access subscription plans. Please submit an application first.");
        
        // Redirect to organizer form after a delay
        setTimeout(() => {
          router.push('/organizer/form');
        }, 3000);
        return;
      }
      
      if (data.status !== 'accepted') {
        // Application exists but isn't accepted
        console.error("Organizer application not approved:", data.status);
        setError(`Your organizer application is currently ${data.status}. You'll be redirected to check your status.`);
        
        // Redirect to status page after a delay
        setTimeout(() => {
          router.push(`/organizer/status/${data.applicationId}`);
        }, 3000);
        return;
      }
      
      // User is an approved organizer, continue (subscription check and plan fetch already called in the useEffect)
    } catch (error) {
      console.error("Error checking organizer status:", error);
      setError("Failed to verify your organizer status. Please try again later.");
    }
  };

  // Add a function to force reload subscription data
  const forceRefreshSubscription = async () => {
    try {
      setRefreshingStatus(true);
      setRefreshComplete(false);
      setRefreshSuccess(false);
      setError(null);
      
      // Clear any cached subscription data
      if (typeof window !== 'undefined') {
        localStorage.removeItem('subscription_data');
        sessionStorage.removeItem('subscription_data');
      }
      
      // Force a fresh request to the server
      const response = await fetch('/api/subscriptions/check', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        body: JSON.stringify({ 
          email: session?.user?.email,
          userId: session?.user?.id,
          _forceRefresh: true // Signal to bypass any server caching
        })
      });

      if (!response.ok) {
        throw new Error('Failed to refresh subscription status');
      }

      const data = await response.json();
      console.log("Force refreshed subscription status:", data);
      
      // Update the UI state with the fresh data
      setCurrentSubscription(data);
      setLastChecked(new Date());
      setRefreshSuccess(true);
      
      // Clear URL error parameters if any exist and if we successfully get a subscription
      const urlHasErrorParams = searchParams.has('error') || searchParams.has('message');
      if (urlHasErrorParams && data.hasSubscription) {
        // Create a new URL without the error parameters
        const url = new URL(window.location.href);
        url.searchParams.delete('error');
        url.searchParams.delete('message');
        
        // Update the URL without refreshing the page
        window.history.replaceState({}, '', url.toString());
        
        // Also clear any error state
        setError(null);
      }
      
      return data;
    } catch (error) {
      console.error('Error force refreshing subscription:', error);
      setError('Failed to refresh subscription status. Please try again.');
      setRefreshSuccess(false);
      return null;
    } finally {
      setRefreshingStatus(false);
      setIsCheckingStatus(false);
      setRefreshComplete(true);
      
      // After a brief delay, reset the complete status
      setTimeout(() => {
        setRefreshComplete(false);
      }, 3000);
    }
  };

  // Add a function to fetch plans from the API
  const fetchPlans = async () => {
    try {
      setIsLoadingPlans(true);
      const response = await fetch('/api/subscriptions/plans');
      if (!response.ok) {
        throw new Error('Failed to fetch plans');
      }
      const data = await response.json();
      
      // Transform MongoDB data to match our component's expected structure
      const transformedPlans = data.map((plan: any) => ({
        ...plan,
        _id: plan._id.toString(), // Convert ObjectId to string if needed
        // Map old properties to new structure for compatibility with UI
        isTrial: plan.metadata?.isTrial || plan.slug === 'trial',
        isPopular: plan.metadata?.isPopular || false,
        isEnterprise: plan.metadata?.isEnterpriseFlag || plan.slug === 'enterprise',
        // Ensure description exists (it's used by UI)
        description: plan.description || `${plan.name} subscription plan`
      }));
      
      console.log("Fetched plans:", transformedPlans);
      setPlans(transformedPlans);
      return transformedPlans;
    } catch (error) {
      console.error('Error fetching plans:', error);
      setError('Failed to load subscription plans. Please try again later.');
      return [];
    } finally {
      setIsLoadingPlans(false);
    }
  };

  useEffect(() => {
    // Check if user isn't authenticated, redirect to sign in
    if (typeof window !== 'undefined') {
      // Only redirect if session status is definitely unauthenticated, not when loading
      if (sessionStatus === 'unauthenticated' && !showEnterpriseForm) {
        console.log('Session status is unauthenticated, redirecting to sign in');
        router.push('/auth/signin?callbackUrl=/organizer/subscribe');
        return;
      }
    }

    // Only proceed with subscription and organizer status checks if we have a session
    // and the session is fully loaded (authenticated)
    if (sessionStatus === 'authenticated' && session?.user?.id && session?.user?.email) {
      // Clear any previous errors
      setError(null);
      
      // Check for error parameters in URL
      const errorParam = searchParams?.get('error');
      const messageParam = searchParams?.get('message');
      
      if (errorParam || messageParam) {
        setError(messageParam || errorParam || 'An error occurred during the payment process');
        // Clear the error from the URL
        if (typeof window !== 'undefined') {
          const url = new URL(window.location.href);
          url.searchParams.delete('error');
          url.searchParams.delete('message');
          window.history.replaceState({}, '', url.toString());
        }
      }
      
      // Check subscription status and load plans
      checkSubscriptionStatus();
      fetchPlans();
      
      // Check if the user is an approved organizer
      checkOrganizerStatus();
    }
  }, [sessionStatus, session, router, searchParams]);

  const checkSubscriptionStatus = async (showLoading = true, forceRefresh = false) => {
    if (!session?.user?.email || !session?.user?.id) {
      console.warn("Cannot check subscription - missing user email or ID in session");
      return null;
    }

    try {
      setRefreshComplete(false);
      setRefreshSuccess(false);
      
      if (showLoading) {
        setRefreshingStatus(true);
      }
      
      // Use force refresh if requested
      if (forceRefresh) {
        const result = await forceRefreshSubscription();
        return result;
      }
      
      const response = await fetch('/api/subscriptions/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: session.user.email,
          userId: session.user.id
        })
      });

      const data = await response.json();
      console.log("Subscription status:", data);
      
      // Update the state with the server data
      setCurrentSubscription(data);
      setLastChecked(new Date());
      setRefreshSuccess(true);
      
      return data;
    } catch (error) {
      console.error('Error checking subscription:', error);
      setRefreshSuccess(false);
      return null;
    } finally {
      setIsCheckingStatus(false);
      setRefreshingStatus(false);
      setRefreshComplete(true);
      
      // After a brief delay, reset the complete status
      setTimeout(() => {
        setRefreshComplete(false);
      }, 3000);
    }
  };

  useEffect(() => {
    // Only check subscription status when session is available and loaded
    if (sessionStatus === 'authenticated' && session?.user?.id && session?.user?.email) {
      checkSubscriptionStatus();
    }
  }, [sessionStatus, session?.user?.id]);

  const handleSubscribe = async (planSlug: string) => {
    if (!session?.user?.email || !session?.user?.id) {
      toast.error("Please sign in to subscribe");
      router.push('/auth/signin?callbackUrl=/organizer/subscribe');
      return;
    }

    // Don't allow switching to the same plan
    if (currentSubscription?.plan === planSlug) {
      toast("You're already subscribed to this plan", { 
        icon: 'ℹ️',
        style: { background: '#2563eb', color: 'white' }
      });
      return;
    }

    setLoadingPlanId(planSlug);
    setError(null);

    try {
      // For trial plans, we can bypass the payment process
      if (planSlug === 'trial') {
        // Check if already used trial
        if (currentSubscription?.trialUsed) {
          toast.error("You've already used your free trial");
          setLoadingPlanId(null);
          return;
        }

        // Split the user's name into first and last name
        let firstName = '';
        let lastName = '';
        
        if (session.user.name) {
          const nameParts = session.user.name.split(' ');
          firstName = nameParts[0];
          lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : firstName;
        } else {
          // If no name is available, use email as a fallback
          firstName = session.user.email.split('@')[0];
          lastName = firstName;
        }

        const response = await fetch('/api/subscriptions/create', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email: session.user.email,
            planId: planSlug,
            userId: session.user.id,
            firstName,
            lastName,
            amount: 0,
            currency: 'ETB',
            forceRenew: true  // Always force renew for consistency
          })
        });

        const data = await response.json();
        if (data.success) {
          // Show success message
          setError(null);
          toast.success('Free trial activated successfully! Redirecting to organizer dashboard...');
          
          // Refresh subscription status
          await forceRefreshSubscription();
          
          // Redirect to success page first, then to create page
          router.push('/organizer/subscribe/success?plan=trial');
          return;
        } else {
          setError(data.error || 'Failed to start trial');
        }
      } else {
        // Regular paid plans - apply the same name handling logic
        let firstName = '';
        let lastName = '';
        
        if (session.user.name) {
          const nameParts = session.user.name.split(' ');
          firstName = nameParts[0];
          lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : firstName; 
        } else {
          // If no name is available, use email as a fallback
          firstName = session.user.email.split('@')[0];
          lastName = firstName;
        }

        // Determine if this is an upgrade or downgrade
        const isUpgrade = currentSubscription?.plan && 
                         canUpgrade(currentSubscription.plan, planSlug);
        
        const planChangeType = isUpgrade ? 'upgrade' : 'downgrade';
        console.log(`Attempting to ${planChangeType} from ${currentSubscription?.plan || 'no plan'} to ${planSlug}`);

        // Always set forceRenew to true to replace existing subscriptions
        const response = await fetch('/api/subscriptions/create', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email: session.user.email,
            planId: planSlug,
            userId: session.user.id,
            firstName,
            lastName,
            forceRenew: true,  // Always force renew for consistency
            planChangeType    // Include the change type for logging
          })
        });

        const data = await response.json();
        if (data.success && data.data?.checkoutUrl) {
          // For paid plans, redirect to the payment processor
          window.location.href = data.data.checkoutUrl;
        } else {
          // Check if the error is related to having an active subscription
          if (data.error && data.error.includes("Active subscription exists")) {
            console.log("Active subscription detected, retrying with forceRenew=true");
            
            // Show loading toast for retry
            toast.loading("Processing plan change...");
            
            // Try again with forceRenew explicitly set to true
            const retryResponse = await fetch('/api/subscriptions/create', {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json' 
              },
              body: JSON.stringify({
                email: session.user.email,
                planId: planSlug,
                userId: session.user.id,
                firstName,
                lastName,
                forceRenew: true, // Explicitly force renewal
                planChangeType: 'retry'
              })
            });
            
            toast.dismiss(); // Clear loading toast
            
            const retryData = await retryResponse.json();
            if (retryData.success && retryData.data?.checkoutUrl) {
              toast.success(`Preparing to ${planChangeType} your plan. You'll be redirected to payment.`);
              window.location.href = retryData.data.checkoutUrl;
              return;
            } else {
              const errorMsg = retryData.error || 'Failed to change subscription plan';
              toast.error(errorMsg);
              setError(errorMsg);
            }
          } else {
            const errorMsg = data.error || 'Failed to initiate subscription';
            toast.error(errorMsg);
            setError(errorMsg);
          }
        }
      }
    } catch (error) {
      console.error("Error in subscription process:", error);
      const errorMsg = error instanceof Error ? error.message : 'An error occurred while processing your request';
      toast.error(errorMsg);
      setError(errorMsg);
    } finally {
      setLoadingPlanId(null);
    }
  };

  const canUpgrade = (currentPlan: string, targetPlan: string) => {
    const planOrder = { trial: 0, basic: 1, premium: 2, enterprise: 3 };
    return planOrder[currentPlan as keyof typeof planOrder] < planOrder[targetPlan as keyof typeof planOrder];
  };

  const getButtonText = (plan: Plan) => {
    if (!currentSubscription?.hasSubscription) {
      return plan.isTrial ? 'Start Free Trial' : 'Subscribe';
    }
    
    if (currentSubscription.plan === plan.slug) {
      return 'Current Plan';
    }
    
    if (canUpgrade(currentSubscription.plan || '', plan.slug)) {
      return plan.isTrial ? 'Not Available' : 'Upgrade to This Plan';
    }
    
    return 'Change to This Plan';
  };

  const isButtonDisabled = (plan: Plan) => {
    // Disable trial if already used or on a higher plan
    if (plan.isTrial && (currentSubscription?.trialUsed || currentSubscription?.hasSubscription)) {
      return true;
    }
    
    // Disable current plan
    return currentSubscription?.hasSubscription && currentSubscription.plan === plan.slug;
  };

  const handleEnterpriseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const response = await fetch('/api/subscriptions/enterprise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...enterpriseForm,
          userId: session?.user?.id
        })
      });

      const data = await response.json();

      if (data.success) {
        setError('Enterprise inquiry submitted successfully');
        setShowEnterpriseForm(false);
        setEnterpriseForm({
          companyName: '',
          email: '',
          phone: '',
          message: ''
        });
      } else {
        setError(data.error || 'Failed to submit enterprise inquiry');
      }
    } catch (error) {
      setError('An error occurred while submitting enterprise inquiry');
    } finally {
      setLoadingPlanId(null);
    }
  };

  const getSubscriptionStatusDisplay = () => {
    if (!currentSubscription?.hasSubscription) {
      return null;
    }

    const expiryDate = currentSubscription.expiresAt ? new Date(currentSubscription.expiresAt) : null;
    const formattedDate = expiryDate?.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    let statusColor = 'bg-purple-900/50 border-purple-500';
    let icon = <CheckCircle className="h-6 w-6 text-purple-400" />;
    let message = `You are currently on the ${currentSubscription.plan?.toUpperCase() || 'Active'} plan`;
    
    if (currentSubscription.isExpiringSoon) {
      statusColor = 'bg-yellow-900/50 border-yellow-500';
      icon = <Clock className="h-6 w-6 text-yellow-400" />;
      message = `Your ${currentSubscription.plan?.toUpperCase() || 'Active'} plan is expiring soon`;
    }

    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={`mb-8 p-4 ${statusColor} border rounded-lg flex items-start gap-3`}
      >
        <div className="mt-1">{icon}</div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-white mb-1">{message}</h3>
          <p className="text-gray-300">
            {expiryDate && (
              <>
                Expires on {formattedDate} 
                {currentSubscription.daysRemaining !== undefined && (
                  <span className="text-gray-400 ml-1">
                    ({currentSubscription.daysRemaining} days remaining)
                  </span>
                )}
              </>
            )}
          </p>
          {currentSubscription.isExpiringSoon && (
            <p className="text-yellow-300 mt-2 text-sm">
              Please consider renewing your subscription to ensure uninterrupted service.
            </p>
          )}
          {lastChecked && (
            <p className="text-gray-500 text-xs mt-2">
              Last checked: {lastChecked.toLocaleTimeString()}
            </p>
          )}
        </div>
        <div className="flex flex-col items-center gap-1">
          <button 
            onClick={() => checkSubscriptionStatus(true, true)}
            disabled={refreshingStatus}
            className={`px-3 py-2 ${refreshComplete && refreshSuccess ? 'bg-green-700/70' : 'bg-purple-800/50 hover:bg-purple-700/70'} text-white text-sm rounded-lg transition-all flex items-center gap-2`}
            title="Force refresh subscription status from server"
          >
            {refreshingStatus ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : refreshComplete && refreshSuccess ? (
              <Check className="h-4 w-4" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {refreshingStatus ? 'Refreshing...' : 
             refreshComplete && refreshSuccess ? 'Updated' : 'Refresh'}
          </button>
          {refreshComplete && (
            <span className={`text-xs ${refreshSuccess ? 'text-green-400' : 'text-red-400'}`}>
              {refreshSuccess ? 'Refresh successful' : 'Refresh failed'}
            </span>
          )}
        </div>
      </motion.div>
    );
  };

  if (isCheckingStatus || isLoadingPlans || sessionStatus === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-[#120a19] to-black flex items-center justify-center">
        <NoiseBackground />
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500 mx-auto" />
          <p className="mt-2 text-gray-400">
            {sessionStatus === 'loading' ? 'Loading session...' : 
             isCheckingStatus ? 'Checking subscription status...' : 'Loading plans...'}
          </p>
        </div>
      </div>
    );
  }

  // Helper function to format duration string based on durationDays
  const formatDuration = (plan: Plan): string => {
    // If duration is already provided, use it
    if (plan.duration) return plan.duration;
    
    // If no durationDays, handle special cases
    if (!plan.durationDays) {
      if (isEnterprisePlan(plan)) return 'Custom';
      return 'Subscription';
    }
    
    // Format based on common durations
    if (plan.durationDays === 7) return '1 week';
    if (plan.durationDays === 14) return '2 weeks';
    if (plan.durationDays === 30 || plan.durationDays === 31) return '1 month';
    if (plan.durationDays === 90) return '3 months';
    if (plan.durationDays === 180) return '6 months';
    if (plan.durationDays === 365 || plan.durationDays === 366) return '1 year';
    
    // For any other duration, just show days
    return `${plan.durationDays} days`;
  };

  // Helper function to get included features only
  const getIncludedFeatures = (plan: Plan): Feature[] => {
    if (!plan.features || !Array.isArray(plan.features)) {
      return [];
    }
    return plan.features.filter(feature => feature.included);
  };

  // Helper function to determine if a plan is enterprise
  const isEnterprisePlan = (plan: Plan): boolean => {
    return plan.isEnterprise || plan.metadata?.isEnterpriseFlag || plan.slug === 'enterprise';
  };

  // Helper function to determine if a plan is a trial
  const isTrialPlan = (plan: Plan): boolean => {
    return plan.isTrial || plan.metadata?.isTrial || plan.slug === 'trial';
  };

  // Helper function to determine if a plan is popular
  const isPopularPlan = (plan: Plan): boolean => {
    return plan.isPopular || plan.metadata?.isPopular || false;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-[#120a19] to-black py-20 px-4">
      <NoiseBackground />
      <div className="max-w-7xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl font-bold text-white mb-4">Choose Your Plan</h1>
          <p className="text-gray-400 text-lg">
            {currentSubscription?.hasSubscription 
              ? 'Manage your current subscription or upgrade to unlock more features' 
              : 'Start with a free trial or subscribe to a plan that fits your needs'}
          </p>
        </motion.div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-8 p-4 bg-red-900/50 border border-red-500 rounded-lg flex items-center gap-2 text-red-200"
          >
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <p>{error}</p>
          </motion.div>
        )}

        {getSubscriptionStatusDisplay()}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <AnimatePresence>
            {plans.map((plan, index) => (
              <motion.div
                key={plan.slug}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className={`relative bg-gray-900/80 backdrop-blur-sm rounded-xl p-6 border transition-all duration-300 hover:transform hover:scale-102 hover:shadow-lg hover:shadow-purple-900/20
                  ${isPopularPlan(plan) ? 'border-purple-500 ring-2 ring-purple-500' : 'border-gray-800'}
                  ${isEnterprisePlan(plan) ? 'lg:col-span-1' : ''}`}
              >
                {isPopularPlan(plan) && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-1 rounded-full text-sm font-semibold">
                      Most Popular
                    </div>
                  </div>
                )}

                {isTrialPlan(plan) && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <div className="bg-gradient-to-r from-green-600 to-teal-600 text-white px-4 py-1 rounded-full text-sm font-semibold">
                      Free Trial
                    </div>
                  </div>
                )}

                <div className="text-center mb-6">
                  <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>
                  <p className="text-gray-400 text-sm h-12">{plan.description}</p>
                  <div className="mt-4 flex items-center justify-center gap-1">
                    {isTrialPlan(plan) ? (
                      <div className="flex items-center">
                        <BadgeDollarSign className="text-green-400 h-6 w-6 mr-1" />
                        <span className="text-4xl font-bold text-white">Free</span>
                      </div>
                    ) : (
                      <>
                        {isEnterprisePlan(plan) ? (
                          <span className="text-4xl font-bold text-white flex items-center">
                            <Building2 className="text-purple-400 h-6 w-6 mr-2" />
                            Custom
                          </span>
                        ) : (
                          <span className="text-4xl font-bold text-white flex items-center">
                            <span className="text-2xl text-purple-400 mr-1">ETB</span>
                            {typeof plan.price === 'number' ? plan.price : plan.price}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                  <div className="text-gray-400 mt-1">{formatDuration(plan)}</div>
                </div>

                <ul className="space-y-3 mb-8 min-h-[200px]">
                  {getIncludedFeatures(plan).map((feature) => (
                    <li key={feature.id} className="flex items-center text-gray-300 text-sm">
                      <Check className="h-4 w-4 text-purple-500 mr-2 flex-shrink-0" />
                      <span title={feature.description}>{feature.name}</span>
                    </li>
                  ))}
                  {plan.limits && (
                    <>
                      {plan.limits.maxEvents > 0 && (
                        <li className="flex items-center text-gray-300 text-sm">
                          <Check className="h-4 w-4 text-purple-500 mr-2 flex-shrink-0" />
                          <span>Up to {plan.limits.maxEvents} events</span>
                        </li>
                      )}
                      {plan.limits.maxAttendeesPerEvent > 0 && (
                        <li className="flex items-center text-gray-300 text-sm">
                          <Check className="h-4 w-4 text-purple-500 mr-2 flex-shrink-0" />
                          <span>Up to {plan.limits.maxAttendeesPerEvent} attendees per event</span>
                        </li>
                      )}
                    </>
                  )}
                </ul>

                {isEnterprisePlan(plan) ? (
                  <motion.button
                    onClick={() => setShowEnterpriseForm(true)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    disabled={loadingPlanId === plan.slug}
                    className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-purple-800 text-white rounded-lg font-medium hover:shadow-lg disabled:opacity-50 transition-all"
                  >
                    Contact Sales
                  </motion.button>
                ) : (
                  <motion.button
                    onClick={() => handleSubscribe(plan.slug)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    disabled={isButtonDisabled(plan) || loadingPlanId === plan.slug}
                    className={`w-full py-3 px-4 rounded-lg font-medium hover:shadow-lg transition-all flex items-center justify-center
                      ${isButtonDisabled(plan) 
                        ? 'bg-gray-700 text-gray-400 cursor-not-allowed' 
                        : 'bg-gradient-to-r from-purple-600 to-purple-800 text-white'}`}
                  >
                    {loadingPlanId === plan.slug ? (
                      <>
                        <Loader2 className="animate-spin h-4 w-4 mr-2" />
                        Processing...
                      </>
                    ) : (
                      getButtonText(plan)
                    )}
                  </motion.button>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {showEnterpriseForm && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-gray-900 rounded-xl p-8 max-w-lg w-full border border-gray-800"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white">Enterprise Inquiry</h3>
                <button 
                  onClick={() => setShowEnterpriseForm(false)}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
              
              <form onSubmit={handleEnterpriseSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Company Name</label>
                  <input
                    type="text"
                    value={enterpriseForm.companyName}
                    onChange={(e) => setEnterpriseForm({...enterpriseForm, companyName: e.target.value})}
                    required
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Email</label>
                  <input
                    type="email"
                    value={enterpriseForm.email || session?.user?.email || ''}
                    onChange={(e) => setEnterpriseForm({...enterpriseForm, email: e.target.value})}
                    required
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={enterpriseForm.phone}
                    onChange={(e) => setEnterpriseForm({...enterpriseForm, phone: e.target.value})}
                    required
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Message</label>
                  <textarea
                    value={enterpriseForm.message}
                    onChange={(e) => setEnterpriseForm({...enterpriseForm, message: e.target.value})}
                    required
                    rows={4}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white"
                    placeholder="Tell us about your organization and requirements..."
                  />
                </div>
                
                <div className="flex justify-end gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowEnterpriseForm(false)}
                    className="py-2 px-4 border border-gray-700 text-gray-300 rounded-lg hover:bg-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="py-2 px-4 bg-gradient-to-r from-purple-600 to-purple-800 text-white rounded-lg"
                  >
                    Submit Inquiry
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </div>
      {/* Debug section - can be removed in production */}
      <div className="mt-16 pt-8 border-t border-gray-800">
        <details className="text-xs">
          <summary className="text-gray-500 cursor-pointer hover:text-gray-400 mb-2">
            Debug Information
          </summary>
          <div className="bg-black/50 p-4 rounded text-gray-400 font-mono max-h-80 overflow-auto">
            <div className="mb-2">
              <div className="font-bold">Session:</div>
              <div>Email: {session?.user?.email || 'N/A'}</div>
              <div>User ID: {session?.user?.id || 'N/A'}</div>
            </div>
            <div className="mb-2">
              <div className="font-bold">Subscription Status:</div>
              <div>Has Subscription: {currentSubscription?.hasSubscription ? 'Yes' : 'No'}</div>
              <div>Plan: {currentSubscription?.plan || 'N/A'}</div>
              <div>Expires: {currentSubscription?.expiresAt ? new Date(currentSubscription.expiresAt).toLocaleString() : 'N/A'}</div>
              <div>Days Remaining: {currentSubscription?.daysRemaining || 'N/A'}</div>
              <div>Status: {currentSubscription?.status || 'N/A'}</div>
              <div>Trial Used: {currentSubscription?.trialUsed ? 'Yes' : 'No'}</div>
            </div>
            <div className="mb-2">
              <div className="font-bold">Actions:</div>
              <div className="mt-2 flex flex-wrap gap-2">
                <button 
                  onClick={() => checkSubscriptionStatus(true)}
                  className={`px-2 py-1 ${refreshComplete && !refreshingStatus ? (refreshSuccess ? 'bg-green-900/50 text-green-400 border-green-700' : 'bg-red-900/50 text-red-400 border-red-700') : 'bg-blue-900/50 text-blue-400 border-blue-700'} text-xs rounded border transition-colors flex items-center gap-1`}
                >
                  {refreshingStatus ? <span className="h-2 w-2 bg-blue-400 rounded-full animate-pulse"></span> : null}
                  Recheck Status
                </button>
                <button 
                  onClick={() => checkSubscriptionStatus(true, true)}
                  className={`px-2 py-1 ${refreshComplete && !refreshingStatus ? (refreshSuccess ? 'bg-green-900/50 text-green-400 border-green-700' : 'bg-red-900/50 text-red-400 border-red-700') : 'bg-indigo-900/50 text-indigo-400 border-indigo-700'} text-xs rounded border transition-colors flex items-center gap-1`}
                >
                  {refreshingStatus ? <span className="h-2 w-2 bg-indigo-400 rounded-full animate-pulse"></span> : null}
                  Force Refresh Status
                </button>
                <button 
                  onClick={() => {
                    // Clear any cached data
                    localStorage.removeItem('subscription_data');
                    sessionStorage.removeItem('subscription_data');
                    window.location.reload();
                  }}
                  className="px-2 py-1 bg-purple-900/50 text-purple-400 text-xs rounded border border-purple-700"
                >
                  Clear Cache & Reload
                </button>
                <button 
                  onClick={() => router.push('/organizer/create')}
                  className="px-2 py-1 bg-green-900/50 text-green-400 text-xs rounded border border-green-700"
                >
                  Try Create Event
                </button>
              </div>
            </div>
            {lastChecked && (
              <div className="mt-2 text-gray-500 text-xs">
                Last checked: {lastChecked.toLocaleString()}
                {refreshComplete && 
                  <span className={`ml-2 ${refreshSuccess ? 'text-green-500' : 'text-red-500'}`}>
                    • {refreshSuccess ? 'Refresh successful' : 'Refresh failed'}
                  </span>
                }
              </div>
            )}
          </div>
        </details>
      </div>
    </div>
  );
}

export default function SubscribePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-xl text-purple-400 font-medium">Loading...</p>
        </div>
      </div>
    }>
      <SubscribePageContent />
    </Suspense>
  );
} 