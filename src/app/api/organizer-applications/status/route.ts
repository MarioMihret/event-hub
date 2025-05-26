import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { MONGODB } from "@/constants/auth";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || !session.user.email) {
    return NextResponse.json(
      { success: false, error: "Unauthorized: User not authenticated or missing email in session." },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const queryEmail = searchParams.get('email');

    if (!queryEmail) {
      return NextResponse.json(
        { success: false, error: "Email query parameter is required" },
        { status: 400 }
      );
    }

    // Authorization: User can only query their own application status by email.
    if (session.user.email !== queryEmail) {
      return NextResponse.json(
        { success: false, error: "Forbidden: You can only query your own application status." },
        { status: 403 }
      );
    }

    const db = await connectDB();
    const applicationsCollection = db.collection(MONGODB.collections.organizerApplications);

    // Fetch the application for the authenticated user's email.
    // If a user can have multiple applications and you need the MOST RECENT one,
    // add a sort option here. For example: { sort: { createdAt: -1 } }
    const application = await applicationsCollection.findOne(
      { email: session.user.email }
      // Example if sorting for the most recent is needed:
      // , { sort: { createdAt: -1 } } 
    );

    if (!application) {
      return NextResponse.json(
        { success: false, error: "Application not found for your account." },
        { status: 404 }
      );
    }

    // Return only essential application details
    return NextResponse.json({
      success: true,
      data: {
        applicationId: application._id.toString(),
        status: application.status,
        feedback: application.feedback || ""
      }
    });
  } catch (error) {
    console.error("Error fetching application status by email:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error while fetching application status." },
      { status: 500 }
    );
  }
}