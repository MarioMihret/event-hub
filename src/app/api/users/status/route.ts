import { NextResponse } from "next/server";
import { clientPromise } from "@/lib/mongodb";
import { MONGODB } from "@/constants/auth";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    
    // Connect to MongoDB
    const client = await clientPromise;
    const db = client.db(MONGODB.dbName);
    
    // Look up user in the database
    const user = await db.collection(MONGODB.collections.users).findOne(
      { email },
      { projection: { _id: 1, isActive: 1 } }
    );
    
    // Create response with no-cache headers
    const response = NextResponse.json({
      success: true,
      isActive: user ? user.isActive !== false : true
    });
    
    // Add no-cache headers
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    
    return response;
  } catch (error) {
    console.error("Error checking user status:", error);
    return NextResponse.json({ 
      success: false, 
      error: "Failed to check status" 
    }, { status: 500 });
  }
} 