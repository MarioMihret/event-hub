import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle, ArrowRight, Crown } from 'lucide-react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { IPlanDefinition } from '@/models/PlanDefinition';

interface PlanFeature {
  id: string;
  name: string;
  description: string;
  included: boolean;
  highlighted?: boolean;
}

interface DisplayPlan {
  slug: string;
  name: string;
  price: number;
  features: PlanFeature[];
  maxEvents: number;
  isCurrentPlan: boolean;
  recommended?: boolean;
  ctaText?: string;
}

interface LimitReachedScreenProps {
  currentLimit?: number;
  currentSubscription?: string;
  onUpgrade?: () => void;
  plans?: IPlanDefinition[];
}

/**
 * Screen displayed when user has reached their event limit
 */
export function LimitReachedScreen({ 
  currentLimit = 10,
  currentSubscription = 'basic',
  onUpgrade,
  plans: providedPlans
}: LimitReachedScreenProps) {
  const router = useRouter();
  const [displayPlans, setDisplayPlans] = useState<DisplayPlan[]>([]);
  const currentPlanSlug = currentSubscription?.toLowerCase();
  const [isLoadingPlans, setIsLoadingPlans] = useState(true);
  
  // Fetch available plans if not provided
  useEffect(() => {
    const fetchPlans = async () => {
      if (!providedPlans) {
        try {
          setIsLoadingPlans(true);
          const response = await fetch('/api/subscriptions/plans');
          if (response.ok) {
            const data = await response.json();
            return data;
          }
        } catch (error) {
          console.error("Error fetching subscription plans:", error);
        } finally {
          setIsLoadingPlans(false);
        }
      }
      return null;
    };

    // Process plans
    const processPlans = async () => {
      // If plans are provided, use them
      if (providedPlans && providedPlans.length > 0) {
        const formattedPlans = providedPlans.map(plan => ({
          slug: plan.slug,
          name: plan.name,
          price: plan.price,
          features: plan.features.map(feature => ({
            ...feature,
            highlighted: feature.id.includes('premium') || feature.id.includes('advanced')
          })),
          maxEvents: plan.limits?.maxEvents ?? 10,
          isCurrentPlan: plan.slug === currentPlanSlug || plan.limits?.maxEvents === currentLimit,
          recommended: plan.metadata?.isPopular,
          ctaText: plan.metadata?.isPopular ? 'Most Popular' : 
                  plan.metadata?.isEnterpriseFlag ? 'Best Value' : undefined
        }));
        setDisplayPlans(formattedPlans);
        setIsLoadingPlans(false);
      } else {
        // Try to fetch plans from API
        const apiPlans = await fetchPlans();
        if (apiPlans && apiPlans.length > 0) {
          const formattedPlans = apiPlans.map((plan: any) => ({
            slug: plan.slug,
            name: plan.name,
            price: typeof plan.price === 'number' ? plan.price : parseFloat(plan.price) || 0,
            features: (plan.features || []).map((feature: any) => ({
              ...feature,
              highlighted: feature.id.includes('premium') || feature.id.includes('advanced')
            })),
            maxEvents: plan.limits?.maxEvents ?? 10,
            isCurrentPlan: plan.slug === currentPlanSlug || plan.limits?.maxEvents === currentLimit,
            recommended: plan.metadata?.isPopular,
            ctaText: plan.metadata?.isPopular ? 'Most Popular' : 
                    plan.metadata?.isEnterpriseFlag ? 'Best Value' : undefined
          }));
          setDisplayPlans(formattedPlans);
        } else {
          // Fallback to hardcoded plans when no plans are provided
          const defaultPlans: DisplayPlan[] = [
            {
              slug: 'basic',
              name: 'Basic',
              price: 9.99,
              features: [
                { id: 'events', name: 'Events', description: `Up to ${currentLimit === 10 ? currentLimit : 10} events`, included: true },
                { id: 'analytics', name: 'Analytics', description: 'Basic analytics', included: true },
                { id: 'support', name: 'Support', description: 'Standard support', included: true },
              ],
              maxEvents: 10,
              isCurrentPlan: currentPlanSlug === 'basic' || currentLimit === 10
            },
            {
              slug: 'premium',
              name: 'Premium',
              price: 19.99,
              features: [
                { id: 'events', name: 'Events', description: 'Up to 50 events', included: true, highlighted: true },
                { id: 'analytics', name: 'Analytics', description: 'Advanced analytics', included: true, highlighted: true },
                { id: 'branding', name: 'Branding', description: 'Custom branding', included: true },
                { id: 'support', name: 'Support', description: 'Priority support', included: true },
              ],
              maxEvents: 50,
              isCurrentPlan: currentPlanSlug === 'premium' || currentLimit === 50,
              recommended: true,
              ctaText: 'Most Popular'
            },
            {
              slug: 'enterprise',
              name: 'Enterprise',
              price: 39.99,
              features: [
                { id: 'events', name: 'Events', description: 'Unlimited events', included: true, highlighted: true },
                { id: 'analytics', name: 'Analytics', description: 'Premium analytics', included: true },
                { id: 'branding', name: 'Branding', description: 'Custom branding', included: true },
                { id: 'support', name: 'Support', description: 'Priority support', included: true },
                { id: 'account_manager', name: 'Account Manager', description: 'Dedicated account manager', included: true },
              ],
              maxEvents: Infinity,
              isCurrentPlan: currentPlanSlug === 'enterprise' || currentLimit === Infinity,
              ctaText: 'Best Value'
            }
          ];
          setDisplayPlans(defaultPlans);
        }
      }
    };

    processPlans();
  }, [providedPlans, currentPlanSlug, currentLimit]);

  const handleUpgrade = () => {
    if (onUpgrade) {
      onUpgrade();
    } else {
      router.push('/organizer/subscribe');
    }
  };

  const formatPrice = (price: number): string => {
    return `$${price.toFixed(2)}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black py-16 px-4">
      <div className="max-w-4xl mx-auto">
        <motion.div 
          className="bg-gradient-to-br from-gray-800/70 to-gray-900/70 backdrop-blur-md rounded-2xl p-8 border border-teal-500/20 shadow-2xl mb-12"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="flex flex-col md:flex-row items-start gap-6">
            <div className="bg-teal-500/10 p-4 rounded-full flex-shrink-0">
              <AlertCircle className="w-8 h-8 text-teal-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white mb-3">Event Limit Reached</h1>
              <p className="text-gray-300 text-lg mb-6">
                You've reached the maximum limit of {currentLimit === Infinity ? 'unlimited' : currentLimit} events on your <span className="font-semibold text-teal-300 capitalize">{currentSubscription}</span> plan. 
                {currentLimit !== Infinity && (
                  <>
                    <br/>
                    <span className="text-base">
                      Upgrade now to create more events and unlock additional features.
                    </span>
                  </>
                )}
              </p>
              <button
                onClick={handleUpgrade}
                className="px-6 py-3 bg-gradient-to-r from-teal-600 to-teal-800 hover:from-teal-500 hover:to-teal-700 
                          text-white rounded-lg transition-all flex items-center gap-2 shadow-lg shadow-teal-900/30"
              >
                <span>Upgrade Your Plan</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <h2 className="text-2xl font-bold text-white mb-3 text-center">Subscription Plans</h2>
          <p className="text-gray-400 text-center mb-10">Choose the plan that fits your event organization needs</p>
        </motion.div>
        
        {isLoadingPlans ? (
          <div className="flex justify-center items-center py-10">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-teal-500 mr-3"></div>
            <span className="text-teal-300">Loading available plans...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {displayPlans.map((plan, index) => (
              <PlanCard 
                key={plan.slug}
                plan={plan}
                index={index}
                onUpgrade={handleUpgrade}
                formatPrice={formatPrice}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface PlanCardProps {
  plan: DisplayPlan;
  index: number;
  onUpgrade: () => void;
  formatPrice: (price: number) => string;
}

const PlanCard: React.FC<PlanCardProps> = ({ plan, index, onUpgrade, formatPrice }) => {
  return (
            <motion.div
              className={`relative rounded-xl overflow-hidden h-full ${
                plan.recommended 
                  ? 'bg-gradient-to-br from-teal-900/70 to-gray-900/70 border-2 border-teal-500 shadow-lg shadow-teal-500/20' 
                  : 'bg-gray-800/50 border border-gray-700/30'
              }`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 + 0.3 }}
            >
              {plan.recommended && (
                <div className="absolute top-0 right-0 bg-teal-600 text-white text-xs font-bold px-3 py-1 flex items-center">
                  <Crown className="w-3 h-3 mr-1" />
                  RECOMMENDED
                </div>
              )}
              
              {plan.isCurrentPlan && (
                <div className="absolute top-0 left-0 bg-blue-600 text-white text-xs font-bold px-3 py-1">
                  CURRENT PLAN
                </div>
              )}
              
              <div className="p-6 flex flex-col h-full">
                <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>
        <p className="text-3xl font-bold text-white mb-6">{formatPrice(plan.price)}<span className="text-sm font-normal text-gray-400">/month</span></p>
                
                <ul className="space-y-3 mb-8 flex-grow">
                  {plan.features.map((feature, i) => (
            <li key={feature.id} className="flex items-start gap-2">
                      <CheckCircle className={`w-5 h-5 ${feature.highlighted ? 'text-teal-400' : 'text-green-400'} mt-0.5 flex-shrink-0`} />
              <span className={`${feature.highlighted ? 'text-white font-medium' : 'text-gray-300'}`}>{feature.description}</span>
                    </li>
                  ))}
                </ul>
                
                <button
          onClick={onUpgrade}
                  disabled={plan.isCurrentPlan}
                  className={`w-full py-2.5 rounded-lg transition-colors font-medium ${
                    plan.isCurrentPlan
                      ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                      : plan.recommended
                        ? 'bg-teal-600 hover:bg-teal-700 text-white'
                        : 'bg-gray-700 hover:bg-gray-600 text-white'
                  }`}
                >
                  {plan.isCurrentPlan 
                    ? 'Current Plan' 
                    : plan.ctaText 
                      ? plan.ctaText 
                      : 'Select Plan'
                  }
                </button>
              </div>
            </motion.div>
  );
};