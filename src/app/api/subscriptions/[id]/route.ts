import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { logger } from '@/utils/logger';
import { createApiResponse, createErrorResponse } from '@/utils/apiUtils';

const updateSubscriptionSchema = {
  status: { type: 'string', enum: ['active', 'cancelled', 'expired'] },
  paymentStatus: { type: 'string', enum: ['paid', 'pending', 'failed', 'refunded'] }
};

// Helper function to get subscription by ID with proper ObjectId handling
async function getSubscriptionById(id: string) {
  try {
    // Validate if the ID is a valid ObjectId
    if (!ObjectId.isValid(id)) {
      logger.warn(`Invalid ObjectId provided: ${id}`);
      return null;
    }

    const subscriptionsCollection = await getCollection('subscriptions');
    const subscription = await subscriptionsCollection.findOne({ _id: new ObjectId(id) });
    
    // Return null if not found
    if (!subscription) {
      return null;
    }
    
    // Ensure _id is a string for consistent response format
    return { 
      ...subscription,
      _id: subscription._id.toString(),
    };
  } catch (error) {
    logger.error('Error in getSubscriptionById:', error);
    throw error;
  }
}

// Get subscription details
export async function GET(request: NextRequest, context: { params: { id: string } }) {
  try {
        const id = context.params.id;
        logger.info(`Fetching subscription with ID: ${id}`);
    
    const subscription = await getSubscriptionById(id);
    
    if (!subscription) {
          return createErrorResponse('Subscription not found', 404);
    }

        return createApiResponse(subscription);
  } catch (error) {
        logger.error('Error fetching subscription:', error);
        return createErrorResponse('Failed to fetch subscription', 500);
  }
}

// Update subscription
export async function PUT(request: NextRequest, context: { params: { id: string } }) {
  try {
        const id = context.params.id;
        logger.info(`Updating subscription with ID: ${id}`);
    
    // Validate if the ID is a valid ObjectId
    if (!ObjectId.isValid(id)) {
          return createErrorResponse('Invalid subscription ID format', 400);
    }

    const subscriptionsCollection = await getCollection('subscriptions');
    const body = await request.json();
    
    // Add updatedAt timestamp to updates
    const updateData = {
      ...body,
      updatedAt: new Date()
    };
        
        logger.info(`Update data for subscription ${id}`);
    
    const result = await subscriptionsCollection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updateData },
          { returnDocument: 'after' }
    );
    
    // Get the updated document from the result
        const updatedSubscription = result;
    
    if (!updatedSubscription) {
          return createErrorResponse('Subscription not found', 404);
    }
    
    // Ensure _id is a string for consistent response format
    const subscription = { 
      ...updatedSubscription,
      _id: updatedSubscription._id.toString()
    };

        return createApiResponse(subscription);
  } catch (error) {
        logger.error('Error updating subscription:', error);
        return createErrorResponse('Failed to update subscription', 500);
  }
}

// Cancel subscription
export async function DELETE(request: NextRequest, context: { params: { id: string } }) {
  try {
        const id = context.params.id;
        logger.info(`Cancelling subscription with ID: ${id}`);
    
    // Validate if the ID is a valid ObjectId
    if (!ObjectId.isValid(id)) {
          return createErrorResponse('Invalid subscription ID format', 400);
    }
    
    const url = new URL(request.url);
    const reason = url.searchParams.get('reason');
    
    const subscriptionsCollection = await getCollection('subscriptions');
    
    // For cancellation, we update the status rather than deleting
    const updateData = {
      status: 'cancelled',
      paymentStatus: 'cancelled',
      cancelledAt: new Date(),
      updatedAt: new Date(),
      cancellationReason: reason || 'User requested cancellation'
    };
        
        logger.info(`Cancellation data for subscription ${id}`);
    
    const result = await subscriptionsCollection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updateData },
          { returnDocument: 'after' }
    );
    
    // Get the updated document from the result
        const updatedSubscription = result;
    
    if (!updatedSubscription) {
          return createErrorResponse('Subscription not found', 404);
    }
    
    // Ensure _id is a string for consistent response format
    const subscription = { 
      ...updatedSubscription,
      _id: updatedSubscription._id.toString()
    };

        return createApiResponse(subscription);
  } catch (error) {
        logger.error('Error cancelling subscription:', error);
        return createErrorResponse('Failed to cancel subscription', 500);
  }
} 