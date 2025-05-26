import { ObjectId } from 'mongodb';
import { getCollection } from '@/lib/mongodb';
import { logger } from '@/utils/logger';
import { MONGODB } from '@/constants/auth';

/**
 * Service to handle subscription related functionality
 */
class SubscriptionService {
  /**
   * Get the current active subscription for a user
   * @param userId User ID to check
   * @returns Active subscription or null
   */
  async getCurrentSubscription(userId: string) {
    try {
      // Validate the user ID
      if (!userId) {
        logger.warn('Invalid or missing userId provided to getCurrentSubscription');
        return null;
      }

      // Convert to ObjectId if string
      let userObjectId;
      if (ObjectId.isValid(userId)) {
        userObjectId = new ObjectId(userId);
      } else {
        logger.warn(`Non-ObjectId userId provided: ${userId}`);
        return null;
      }

      // Get the subscriptions collection
      const subscriptionsCollection = await getCollection(MONGODB.collections.subscriptions);

      // Find active subscriptions with valid end dates
      const currentDate = new Date();
      const activeSubscriptions = await subscriptionsCollection
        .find({
          userId: userObjectId,
          status: 'active',
          endDate: { $gt: currentDate }
        })
        .sort({ createdAt: -1 })
        .toArray();

      // Return the most recent active subscription, or null if none found
      return activeSubscriptions.length > 0 ? activeSubscriptions[0] : null;
    } catch (error) {
      logger.error('Error in getCurrentSubscription:', error);
      return null;
    }
  }

  /**
   * Get plan details by plan ID
   * @param planId Plan ID to look up
   * @returns Plan details or null
   */
  async getPlan(planId: string) {
    try {
      if (!planId) {
        logger.warn('Invalid or missing planId provided to getPlan');
        return null;
      }

      const planDefinitionsCollection = await getCollection('planDefinitions');
      const plan = await planDefinitionsCollection.findOne({ slug: planId });

      if (plan) {
        return plan;
      }

      // If plan not found, return default plan details
      logger.warn(`Plan not found for ID: ${planId}, returning default plan info`);
      return this.getDefaultPlanInfo(planId);
    } catch (error) {
      logger.error('Error in getPlan:', error);
      return this.getDefaultPlanInfo(planId);
    }
  }

  /**
   * Create default plan info when plan definition is not found
   * @param planId Plan ID to create defaults for
   * @returns Default plan info
   */
  private getDefaultPlanInfo(planId: string) {
    // Define default limits based on plan ID
    const defaultLimits = {
      maxEvents: planId === 'trial' ? 2 : 
                 planId === 'basic' ? 10 : 
                 planId === 'premium' ? 50 : 5,
      maxAttendeesPerEvent: planId === 'premium' ? 500 : 100,
      maxFileUploads: 10,
      maxImageSize: 10,
      maxVideoLength: 5,
      customDomain: planId === 'premium',
      analytics: planId === 'premium' ? 'advanced' : 'basic',
      support: planId === 'premium' ? 'priority' : 'email',
      eventTypes: planId === 'premium' ? 
                 ['basic', 'advanced', 'premium'] : 
                 ['basic']
    };
    
    return {
      _id: `default_${planId}`,
      slug: planId,
      name: `${planId.charAt(0).toUpperCase()}${planId.slice(1)} Plan`,
      limits: defaultLimits
    };
  }

  /**
   * Get subscription history for a user
   * @param userId User ID to check
   * @returns Array of subscription history
   */
  async getSubscriptionHistory(userId: string) {
    try {
      // Validate the user ID
      if (!userId) {
        logger.warn('Invalid or missing userId provided to getSubscriptionHistory');
        return [];
      }

      // Convert to ObjectId if string
      let userObjectId;
      if (ObjectId.isValid(userId)) {
        userObjectId = new ObjectId(userId);
      } else {
        logger.warn(`Non-ObjectId userId provided: ${userId}`);
        return [];
      }

      // Get the subscriptions collection
      const subscriptionsCollection = await getCollection(MONGODB.collections.subscriptions);

      // Find all subscriptions for the user
      const subscriptions = await subscriptionsCollection
        .find({
          userId: userObjectId,
        })
        .sort({ createdAt: -1 })
        .toArray();

      return subscriptions;
    } catch (error) {
      logger.error('Error in getSubscriptionHistory:', error);
      return [];
    }
  }

  /**
   * Counts all active subscriptions for a user
   * @param userId User ID to check
   * @returns Count of active subscriptions
   */
  async countActiveSubscriptions(userId: string) {
    try {
      if (!userId || !ObjectId.isValid(userId)) {
        return 0;
      }
      
      const userObjectId = new ObjectId(userId);
      const subscriptionsCollection = await getCollection(MONGODB.collections.subscriptions);
      
      const currentDate = new Date();
      const count = await subscriptionsCollection.countDocuments({
        userId: userObjectId,
        status: 'active',
        endDate: { $gt: currentDate }
      });
      
      return count;
    } catch (error) {
      logger.error('Error in countActiveSubscriptions:', error);
      return 0;
    }
  }
}

// Export a singleton instance
export const subscriptionService = new SubscriptionService(); 