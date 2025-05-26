import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { MONGODB } from "@/constants/auth";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || !session.user.email) {
    return NextResponse.json(
      { success: false, error: "Unauthorized or user email not found in session." },
      { status: 401 }
    );
  }

  const userEmail = session.user.email; // Use authenticated user's email

  try {
    // const { email } = await req.json(); // Email from body is removed
    console.log("Validating application for authenticated user:", userEmail);

    // if (!email) { ... } // Check is now based on session email

    const db = await connectDB();
    const applicationsCollection = db.collection(MONGODB.collections.organizerApplications);

    // Find the most recent application for the authenticated user's email
    // POTENTIAL ISSUE: Critical to verify that 'createdAt' is the correct field and path for sorting.
    // If incorrect, the wrong application might be fetched, leading to incorrect validation results.
    const application = await applicationsCollection.findOne(
      { email: userEmail },
      {
        sort: { createdAt: -1 }, // Assuming createdAt is at the root
        projection: {
          _id: 1,
          status: 1,
          // email: 1, // Not strictly needed from DB if using userEmail
          fullName: 1,
          createdAt: 1
        }
      }
    );

    if (!application) {
      console.log("No application found for user:", userEmail);
      return NextResponse.json({
        success: false, // Or true with a status like 'not_found'
        error: "No application found for your account.",
        // shouldRedirect: "form" // This route didn't originally have shouldRedirect, add if desired
      }, { status: 404 }); // Return 404
    }

    return NextResponse.json({
      success: true,
      applicationId: application._id.toString(),
      status: application.status,
      email: userEmail, // Return the user's email
      fullName: application.fullName,
      createdAt: application.createdAt
    });

  } catch (error) {
    console.error("Error validating application for user:", userEmail, error);
    const errorMessage = error instanceof Error ? error.message : "Failed to validate application";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
} 