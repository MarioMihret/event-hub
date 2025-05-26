import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { MONGODB } from "@/constants/auth";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET(
  request: Request,
  context: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !session.user.id) {
    return NextResponse.json(
      { success: false, error: "Unauthorized: User not authenticated or missing ID in session." },
      { status: 401 }
    );
  }

  try {
    const resolvedContextParams = await context.params;
    const { id } = resolvedContextParams;
    console.log(`Received application ID: ${id} for user ID: ${session.user.id}`); 

    if (!ObjectId.isValid(id)) {
      console.error(`Invalid application ID format: ${id}`);
      return NextResponse.json(
        { success: false, error: "Invalid application ID format" },
        { status: 400 }
      );
    }

    const db = await connectDB();
    const applicationsCollection = db.collection(MONGODB.collections.organizerApplications);

    const application = await applicationsCollection.findOne({
      _id: new ObjectId(id),
    });

    if (!application) {
      console.error(`Application not found for ID: ${id}`);
      return NextResponse.json(
        { success: false, error: "Application not found." }, // Generic message as user might not own it
        { status: 404 }
      );
    }

    // Check if userId exists on the application document
    if (!application.userId) {
      console.error(`Data integrity issue: Application ${id} is missing the userId field.`);
      return NextResponse.json(
        { success: false, error: "Forbidden: Cannot verify application ownership due to missing data." },
        { status: 403 }
      );
    }

    // Authorization: User can only see their own application.
    if (application.userId.toString() !== session.user.id) {
      console.warn(`Forbidden access attempt: User ${session.user.id} (session) to application ${id} owned by ${application.userId.toString()} (db)`);
      return NextResponse.json(
        { success: false, error: "Forbidden: You do not have permission to view this application." },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        applicationId: application._id.toString(), // Ensure ID is string
        status: application.status,
        feedback: application.feedback || "",
        updatedAt: application.updatedAt,
        // email and fullName removed to minimize data exposure
      },
    });
  } catch (error) {
    console.error("Error fetching application status by ID:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch application status. Please try again." },
      { status: 500 }
    );
  }
}

// ADMIN ROUTES BELOW

export async function PATCH(
  request: Request,
  context: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) { // Basic authentication check
    return NextResponse.json(
      { success: false, error: "Unauthorized: Authentication required." },
      { status: 401 }
    );
  }

  // Check if the user is an admin
  // @ts-ignore // Add this if session.user.role is not explicitly typed, otherwise remove
  if (session.user.role !== 'admin') {
    return NextResponse.json(
      { success: false, error: "Forbidden: You do not have permission to perform this action." },
      { status: 403 }
    );
  }

  try {
    const { id } = context.params; // No await needed
    const requestData = await request.json();
    const { status, feedback } = requestData;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid application ID format" },
        { status: 400 }
      );
    }

    if (!status || !['pending', 'accepted', 'rejected'].includes(status)) {
      return NextResponse.json(
        { success: false, error: "Invalid status value. Must be one of: pending, accepted, rejected." },
        { status: 400 }
      );
    }

    const db = await connectDB();
    const applicationsCollection = db.collection(MONGODB.collections.organizerApplications);

    const result = await applicationsCollection.updateOne(
      { _id: new ObjectId(id) },
      { 
        $set: { 
          status, 
          feedback: feedback || "", // Ensure feedback is not undefined
          updatedAt: new Date()
        } 
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { success: false, error: "Application not found" },
        { status: 404 }
      );
    }

    // Optionally, fetch the updated application to return it
    // const updatedApplication = await applicationsCollection.findOne({ _id: new ObjectId(id) });

    return NextResponse.json({
      success: true,
      message: `Application status successfully updated to ${status}.`
      // data: updatedApplication // if returning the updated document
    });
  } catch (error) {
    console.error("Error updating application status:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to update application status";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

// If you want the PUT handler as well, it can be added similarly:
// export async function PUT(
//   request: Request,
//   context: { params: { id: string } }
// ) {
//   const session = await getServerSession(authOptions);
//   if (!session || !session.user) {
//     return NextResponse.json(
//       { success: false, error: "Unauthorized: Authentication required." },
//       { status: 401 }
//     );
//   }
//   // TODO: Add authorization logic (e.g., admin or owner)
//   // TODO: Add PUT logic
//   try {
//     const { id } = context.params;
//     if (!ObjectId.isValid(id)) {
//       return NextResponse.json(
//         { error: "Invalid application ID format" },
//         { status: 400 }
//       );
//     }
//     // ... implementation for PUT ...
//     return NextResponse.json({ success: true, message: "PUT not fully implemented yet."});
//   } catch (error) {
//     console.error("Error in PUT:", error);
//     return NextResponse.json(
//       { success: false, error: "Failed to process PUT request" },
//       { status: 500 }
//     );
//   }
// }