import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { MONGODB } from "@/constants/auth";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
// import { AppRole } from "@/types/auth"; // For admin role checking
import { ObjectId } from "mongodb";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || !session.user.id || !session.user.email) {
    return NextResponse.json(
      { success: false, error: "Unauthorized: User not authenticated or missing ID/email in session." },
      { status: 401 }
    );
  }

  const userId = session.user.id;
  const userEmail = session.user.email; // Use this as the authoritative email

  try {
    const db = await connectDB();
    const formData = await request.json();
    console.log(`📩 Received Application Data from user ID: ${userId}`);

    // Align validation with frontend data
    const {
      fullName,
      phone,
      dateOfBirth,
      university,
      department,
      role,
      yearOfStudy, // Conditional: only if role is student
      studentId,   // Conditional: only if role is student
      experience,
      reason,
      skills,
      availability,
      termsAccepted,
      // newsletterSubscription is optional
      idDocument, 
      profilePhoto 
      // email field from formData is ignored, session.user.email is used
    } = formData;

    // Basic Validation (Expand these as needed)
    if (!fullName || typeof fullName !== 'string' || fullName.trim().length < 3) {
      return NextResponse.json({ success: false, error: "Full name is required and must be at least 3 characters." }, { status: 400 });
    }
    if (!phone || typeof phone !== 'string' /* add more specific phone regex */) {
      return NextResponse.json({ success: false, error: "A valid phone number is required." }, { status: 400 });
    }
    if (!dateOfBirth || !/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) { 
      return NextResponse.json({ success: false, error: "Date of birth is required in YYYY-MM-DD format." }, { status: 400 });
    }
     // Basic age check (example, you might have this on client too but good to double check)
    const birthDateObj = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birthDateObj.getFullYear();
    const monthDiff = today.getMonth() - birthDateObj.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDateObj.getDate())) {
      age--;
    }
    if (age < 18) {
      return NextResponse.json({ success: false, error: "Applicant must be at least 18 years old." }, { status: 400 });
    }
    if (!university || typeof university !== 'string' || university.trim().length === 0) {
      return NextResponse.json({ success: false, error: "University is required." }, { status: 400 });
    }
    if (!department || typeof department !== 'string' || department.trim().length === 0) {
      return NextResponse.json({ success: false, error: "Department is required." }, { status: 400 });
    }
    if (!role || (role !== 'student' && role !== 'staff')) {
      return NextResponse.json({ success: false, error: "Valid role (student/staff) is required." }, { status: 400 });
    }
    if (role === 'student') {
      if (!yearOfStudy || typeof yearOfStudy !== 'string' || yearOfStudy.trim().length === 0) {
        return NextResponse.json({ success: false, error: "Year of study is required for students." }, { status: 400 });
      }
      if (!studentId || typeof studentId !== 'string' || studentId.trim().length === 0) {
        return NextResponse.json({ success: false, error: "Student ID is required for students." }, { status: 400 });
      }
    }
    if (!experience || typeof experience !== 'string') {
        return NextResponse.json({ success: false, error: "Experience selection is required." }, { status: 400 });
    }
    if (!reason || typeof reason !== 'string' || reason.trim().length < 50) {
      return NextResponse.json({ success: false, error: "Reason/motivation is required (min. 50 characters)." }, { status: 400 });
    }
    if (!skills || !Array.isArray(skills) || skills.length === 0) {
      return NextResponse.json({ success: false, error: "At least one skill must be selected." }, { status: 400 });
    }
    if (!availability || typeof availability !== 'string') {
        return NextResponse.json({ success: false, error: "Availability selection is required." }, { status: 400 });
    }
    if (termsAccepted !== true) {
      return NextResponse.json({ success: false, error: "You must accept the terms and conditions." }, { status: 400 });
    }
    if (!idDocument || typeof idDocument !== 'string' /* Add base64 check if strict */ ) {
      return NextResponse.json({ success: false, error: "ID document is required." }, { status: 400 });
    }
    if (!profilePhoto || typeof profilePhoto !== 'string' /* Add base64 check if strict */) {
      return NextResponse.json({ success: false, error: "Profile photo is required." }, { status: 400 });
    }

    const applicationsCollection = db.collection(MONGODB.collections.organizerApplications);

    const existingApplication = await applicationsCollection.findOne({ userId: userId });
    if (existingApplication) {
      console.log("Existing application found for user ID:", userId);
      return NextResponse.json(
        {
          success: false, // Indicate failure to create a new one
          error: "You have already submitted an application.",
          errorCode: "APPLICATION_EXISTS",
          applicationId: existingApplication._id.toString(),
          status: existingApplication.status
        },
        { status: 409 } // 409 Conflict
      );
    }

    // Construct the document to be inserted, ensuring to use validated/processed data
    const newApplicationData = {
      userId, // From session
      email: userEmail, // Authoritative email from session
      fullName,
      phone,
      dateOfBirth,
      university,
      department,
      role,
      yearOfStudy: role === 'student' ? yearOfStudy : undefined, // Only if student
      studentId: role === 'student' ? studentId : undefined,     // Only if student
      experience,
      reason,
      skills,
      availability,
      termsAccepted,
      newsletterSubscription: formData.newsletterSubscription || false, // Ensure it has a default
      idDocument,    // Base64 string
      profilePhoto,  // Base64 string
      status: "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
      feedback: null // Initialize feedback field
    };
    
    // Remove undefined fields (like yearOfStudy if not student) to keep DB clean
    Object.keys(newApplicationData).forEach(key => newApplicationData[key] === undefined && delete newApplicationData[key]);


    const result = await applicationsCollection.insertOne(newApplicationData);
    console.log(`✅ Successfully Saved Application for user ID ${userId}: ${result.insertedId}`);

    return NextResponse.json(
      {
        success: true,
        data: {
          applicationId: result.insertedId.toString(),
          status: "pending"
        }
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(`❌ Error Saving Application for user ID ${userId}:`, error);
    const errorMessage = error instanceof Error ? error.message : "Failed to save application";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest
) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return NextResponse.json(
      { success: false, error: "Unauthorized: User not authenticated." },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Application ID is required as a query parameter." },
        { status: 400 }
      );
    }

    if (!ObjectId.isValid(id)) {
      console.error(`Invalid application ID format: ${id}`);
      return NextResponse.json(
        { success: false, error: "Invalid application ID format" },
        { status: 400 }
      );
    }

    const db = await connectDB();
    const applicationsCollection = db.collection(MONGODB.collections.organizerApplications);
    const application = await applicationsCollection.findOne({ _id: new ObjectId(id) });

    if (!application) {
      console.error(`Application not found for ID: ${id}`);
      return NextResponse.json(
        { success: false, error: "Application not found. Please submit a new application." },
        { status: 404 }
      );
    }

    // Authorization: User can see their own, Admin can see any
    const isOwner = application.userId === session.user.id; // Assumes 'userId' field exists
    // const isAdmin = session.user.role === AppRole.ADMIN; // Admin role check removed

    // POTENTIAL ISSUE: Consider if params.id exists before destructuring.
    // if (!isOwner && !isAdmin) { // Original condition
    if (!isOwner) { // Modified condition: Admin check removed
      return NextResponse.json(
        { success: false, error: "Forbidden: You do not have permission to view this application status." },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        status: application.status,
        feedback: application.feedback || "",
        updatedAt: application.updatedAt,
        // email: application.email, // Removed for reduced data exposure
        // fullName: application.fullName, // Removed for reduced data exposure
        applicationId: id,
      },
    });
  } catch (error) {
    console.error("Error fetching application status:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch application status. Please try again.";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
