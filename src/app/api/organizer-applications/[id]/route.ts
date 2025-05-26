import { ObjectId } from "mongodb";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { MONGODB } from "@/constants/auth";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

// Ensure that params is awaited before accessing properties // This comment is slightly misleading as params is not awaited
export async function GET(request: NextRequest, context: { params: { id: string } }) {
  // CRITICAL SECURITY ISSUE: This endpoint was unauthenticated. Authentication and Authorization now added.
  // It previously allowed anyone with an application ID to fetch all application data.
  // POTENTIAL ISSUE: This route appears redundant with the GET by ID functionality
  // in the parent directory's `../route.ts` and also `../status/[id]/route.ts`.
  // RECOMMENDATION: This entire file/route should likely be deleted to reduce redundancy and attack surface.

  const session = await getServerSession(authOptions);
  if (!session || !session.user || !session.user.id) {
    return NextResponse.json(
      { success: false, error: "Unauthorized: User not authenticated or missing ID in session." },
      { status: 401 }
    );
  }

  try {
    const id = context.params.id;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid application ID" },
        { status: 400 }
      );
    }

    const db = await connectDB();
    const applicationsCollection = db.collection(MONGODB.collections.organizerApplications);

    const application = await applicationsCollection.findOne({
      _id: new ObjectId(id),
    });

    if (!application) {
      return NextResponse.json(
        { success: false, error: "Application not found" },
        { status: 404 }
      );
    }

    // Authorization: User can only see their own application.
    if (application.userId !== session.user.id) {
      return NextResponse.json(
        { success: false, error: "Forbidden: You do not have permission to view this application." },
        { status: 403 }
      );
    }

    // Return limited data
    return NextResponse.json({
      success: true,
      data: {
        applicationId: application._id.toString(),
        status: application.status,
        feedback: application.feedback || "",
        updatedAt: application.updatedAt,
      }
    });
  } catch (error) {
    console.error("Error fetching application by ID (in [id]/route.ts):", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
