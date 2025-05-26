import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongodb';
// import { withErrorHandler, withRateLimit, withAuth } from '@/lib/middleware/apiMiddleware'; // REMOVED
import { ObjectId } from 'mongodb';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) { // Changed to async function and removed wrappers
  try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');

        if (!userId) {
          return NextResponse.json(
            { error: 'userId is required' },
            { status: 400 }
          );
        }

          // Convert to ObjectId if valid
          let userObjectId;
          if (ObjectId.isValid(userId)) {
            userObjectId = new ObjectId(userId);
          } else {
            return NextResponse.json(
              { error: 'Invalid userId format' },
              { status: 400 }
            );
          }

          // Get subscriptions collection
          const subscriptionsCollection = await getCollection('subscriptions');
          
          // Current date for comparison
          const currentDate = new Date();

          // Get all subscriptions for this user
          const subscriptions = await subscriptionsCollection.find({ userId: userObjectId })
            .sort({ createdAt: -1 })
            .toArray();
          
          // Find active subscriptions
          const activeSubscriptions = subscriptions.filter(sub => 
            sub.status === 'active' && new Date(sub.endDate) > currentDate
          );
          
          // Find trial subscriptions
          const trialSubscription = subscriptions.find(sub => 
            sub.planId === 'trial'
          );
          
          // Calculate subscription analytics
          const analytics = {
            activeSubscription: activeSubscriptions.length > 0,
            totalSubscriptions: subscriptions.length,
            activeCount: activeSubscriptions.length,
            expiredCount: subscriptions.filter(s => 
              s.status !== 'active' || new Date(s.endDate) <= currentDate
            ).length,
            trialUsed: !!trialSubscription,
            history: subscriptions.map(s => ({
              id: s._id.toString(),
              planId: s.planId,
              status: s.status,
              startDate: s.startDate,
              endDate: s.endDate
            }))
          };

        return NextResponse.json(analytics);
        } catch (error) {
          console.error('Error fetching subscription analytics:', error);
          return NextResponse.json(
            { error: 'Failed to fetch subscription analytics' },
            { status: 500 }
          );
        }
      }
// REMOVED closing parentheses for withErrorHandler, withAuth, and withRateLimit
//   )
// )
// );