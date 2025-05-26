import { NextRequest, NextResponse } from "next/server";
import { connectDB, getCollection } from "@/lib/mongodb";
import { MONGODB } from "@/constants/auth";
import { logger } from "@/utils/logger";
import { createApiResponse, createErrorResponse } from "@/utils/apiUtils";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

// Cache for application check results
// const applicationCheckCache = new Map<string, {result: any, timestamp: number}>(); // REMOVED
// const CACHE_TTL = 60 * 1000; // 1 minute cache // REMOVED

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user || !session.user.email) {
    // Using your existing createErrorResponse
    return createErrorResponse("Unauthorized or user email not found in session.", 401);
  }

  const userEmail = session.user.email; // Use authenticated user's email

  try {
    // const { email } = await req.json(); // Email from body is removed
    logger.info(`Checking application existence for authenticated user: ${userEmail}`);

    // if (!email) { ... } // Check is now based on session email

    const applicationsCollection = await getCollection(MONGODB.collections.organizerApplications);

    // POTENTIAL ISSUE: Added sort by createdAt: -1 to fetch the most recent application.
    // It is critical to verify that 'createdAt' is the correct field and path for sorting in your database schema.
    // If incorrect, or if checking *any* application (not necessarily the latest) is intended, this sort may need adjustment or removal.
    const application = await applicationsCollection.findOne(
      { email: userEmail }, // Query by authenticated user's email
      {
        projection: { _id: 1 },
        sort: { createdAt: -1 } // Added to fetch the most recent application
      }
    );

    logger.info(`Application check for ${userEmail}: ${application ? "Found" : "Not found"}`);

    return createApiResponse({
      success: true,
      exists: !!application,
      applicationId: application ? application._id.toString() : null
    });

  } catch (error) {
    logger.error(`Error checking application for ${userEmail}:`, error);
    return createErrorResponse("Failed to check application", 500);
  } finally {
    const duration = Date.now() - startTime;
    if (duration > 200) {
      logger.warn(`Slow application check for ${userEmail} - took ${duration}ms`);
    }
  }
} 