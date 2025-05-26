import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { MONGODB } from "@/constants/auth";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

// WARNING: This is a debug endpoint and exposes sensitive information.
// It should be strictly limited to development environments or require specific developer/admin roles.
// For production, it is highly recommended to remove this route entirely.
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json(
      { success: false, error: "Unauthorized: Authentication required for debug endpoint." },
      { status: 401 }
    );
  }
  // Further role-based access control could be added here if needed, e.g.:
  // if (session.user.role !== 'developer') { return NextResponse.json({error: 'Forbidden'}, {status: 403}); }

  try {
    const db = await connectDB();
    
    // List all collections to verify the database structure
    const collections = await db.listCollections().toArray();
    console.log("Available collections:", collections.map(c => c.name));
    
    const applicationsCollection = db.collection(MONGODB.collections.organizerApplications);
    console.log("Using collection:", MONGODB.collections.organizerApplications);

    // Count applications in the collection
    const count = await applicationsCollection.countDocuments();
    console.log("Total applications:", count);

    // Get latest 5 applications (to avoid too much data transfer)
    const latestApplications = await applicationsCollection
      .find({}, { projection: { fullName: 1, email: 1, status: 1, createdAt: 1 } })
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray();

    return NextResponse.json({
      success: true,
      data: {
        collections: collections.map(c => c.name),
        applicationsCount: count,
        latestApplications
      }
    });
  } catch (error) {
    console.error("Debug API error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to get debug information" },
      { status: 500 }
    );
  }
} 