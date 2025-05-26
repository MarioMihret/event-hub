import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { MONGODB } from "@/constants/auth";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || !session.user.email) {
    return NextResponse.json(
      { success: false, error: "Unauthorized or user email not found in session." , shouldRedirect: "form" }, // Added shouldRedirect hint
      { status: 401 }
    );
  }

  const userEmail = session.user.email; // Use authenticated user's email

  try {
    // const { email } = await req.json(); // Email from body is removed
    // if (!email) { ... } // Check is now based on session email

    const db = await connectDB();
    const applicationsCollection = db.collection(MONGODB.collections.organizerApplications);

    // Find the most recent application for the authenticated user's email
    // Assuming 'createdAt' is at the root of the document. If it's 'metadata.createdAt', adjust sort key.
    // POTENTIAL ISSUE: Critical to verify that 'createdAt' is the correct field and path for sorting.
    // If incorrect, the wrong application might be fetched.
    const application = await applicationsCollection.findOne(
      { email: userEmail },
      {
        sort: { createdAt: -1 }, // Verify this sort key against your data structure
        projection: {
          _id: 1,
          status: 1,
          // email: 1, // Not strictly needed in projection if using userEmail
          // metadata: 1, // Only if 'metadata.createdAt' or other metadata is used
          fullName: 1 // Used in response
        }
      }
    );

    if (!application) {
      return NextResponse.json({
        success: false, // Or true with a specific status like 'not_found'
        error: "No application found for your account.",
        shouldRedirect: "form",
        message: "Please submit an organizer application"
      }, { status: 404 }); // Return 404 if no application
    }

    // Switch logic remains largely the same but now operates on authenticated user's data
    switch (application.status) {
      case "accepted":
        return NextResponse.json({
          success: true,
          status: "accepted",
          applicationId: application._id.toString(),
          fullName: application.fullName,
          shouldRedirect: "dashboard"
        });
      case "pending":
        return NextResponse.json({
          success: true, // Still success, but status is pending
          status: "pending",
          applicationId: application._id.toString(),
          fullName: application.fullName, // Added for consistency
          shouldRedirect: "status",
          message: "Your application is still under review"
        });
      case "rejected":
        return NextResponse.json({
          success: true, // Still success, but status is rejected
          status: "rejected",
          applicationId: application._id.toString(), // Added for consistency
          fullName: application.fullName, // Added for consistency
          shouldRedirect: "form",
          message: "Your previous application was rejected. You may submit a new one."
        });
      default:
        return NextResponse.json({
          success: false,
          error: "Unknown application status",
          applicationId: application._id.toString(),
          fullName: application.fullName,
          shouldRedirect: "form",
          message: "There was an issue with your application status. Please contact support or submit a new application."
        }, { status: 500 }); // Or a more specific status if the application.status is truly unknown
    }

  } catch (error) {
    console.error("Error verifying organizer status for user:", userEmail, error);
    const errorMessage = error instanceof Error ? error.message : "Failed to verify organizer status";
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        shouldRedirect: "form",
        message: "An error occurred. Please try again"
      },
      { status: 500 }
    );
  }
} 