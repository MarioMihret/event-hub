import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import { MONGODB } from '@/constants/auth'; // Assuming this contains collection names
import { subscriptionService } from '@/lib/services/subscriptionService';
import { ObjectId } from 'mongodb';

interface OrganizerApplicationDocument {
  _id: ObjectId;
  userId: string;
  email: string;
  status: 'pending' | 'accepted' | 'rejected';
  adminFeedback?: string;
  createdAt: Date;
  updatedAt: Date;
  // other fields from your model...
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    const db = await connectDB(); // Assuming connectDB returns a MongoDB Db instance
    if (!db) {
      throw new Error("Failed to connect to the database.");
    }

    // 1. Fetch Organizer Application
    const applicationsCollection = db.collection<OrganizerApplicationDocument>(MONGODB.collections.organizerApplications);
    const application = await applicationsCollection.findOne(
      { userId: userId },
      { sort: { createdAt: -1 } } // Get the most recent
    );

    let applicationStatus = null;
    if (application) {
      applicationStatus = {
        id: application._id.toString(),
        status: application.status,
        reason: application.adminFeedback || null, // 'reason' for rejection/feedback
        createdAt: application.createdAt.toISOString(),
        updatedAt: application.updatedAt.toISOString(),
      };
    }

    // 2. Fetch Subscription Status
    const currentSubscription = await subscriptionService.getCurrentSubscription(userId);
    let subscriptionStatus = null;
    if (currentSubscription && currentSubscription.planId) {
      const plan = await subscriptionService.getPlan(currentSubscription.planId);
      subscriptionStatus = {
        planId: currentSubscription.planId,
        planName: plan?.name || currentSubscription.planId, // Fallback to planId if name not found
        status: currentSubscription.status, // from subscription document
        endDate: currentSubscription.endDate.toISOString(),
        // isExpired is implicitly handled by getCurrentSubscription returning null if expired
        // but we can add it explicitly if currentSubscription is returned even when expired by some other means
        isExpired: new Date(currentSubscription.endDate) <= new Date(), 
        paymentStatus: currentSubscription.paymentStatus,
        startDate: currentSubscription.startDate.toISOString(),
      };
    }

    return NextResponse.json({
      application: applicationStatus,
      subscription: subscriptionStatus,
    });

  } catch (error) {
    console.error('[API/organizer/status-overview] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: 'Failed to fetch organizer status overview', details: errorMessage }, { status: 500 });
  }
} 