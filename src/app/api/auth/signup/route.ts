import { NextResponse, NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { clientPromise } from "@/lib/mongodb";
import { MONGODB } from "@/constants/auth"; // Assuming constants are defined
import { getClientIp } from "@/utils/getClientIp"; // Assuming helper exists

// Validation Regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Requires: 8+ chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{8,}$/;

// Rate Limiting Config
const SIGNUP_LIMIT = 5; // Max 5 signups per window
const SIGNUP_WINDOW_MS = 60 * 60 * 1000; // 1 hour window

export async function POST(req: NextRequest) {
  const clientIp = getClientIp(req);

  try {
    const client = await clientPromise;
    const db = client.db(MONGODB.dbName); // Use constant
    const usersCollection = db.collection("user"); // Collection name: "user"
    const rateLimitCollection = db.collection("rateLimits");

    // --- Rate Limiting Check ---
    if (clientIp) {
      const now = Date.now();
      const windowStart = now - SIGNUP_WINDOW_MS;

      const attempts = await rateLimitCollection.countDocuments({
        ip: clientIp,
        route: "/api/auth/signup",
        timestamp: { $gte: windowStart },
      });

      if (attempts >= SIGNUP_LIMIT) {
        console.warn(`Rate limit exceeded for signup from IP: ${clientIp}`);
        return NextResponse.json(
          { error: "Too many signup attempts. Please try again later." },
          { status: 429 } // Too Many Requests
        );
      }

      // Log the attempt for rate limiting
      await rateLimitCollection.insertOne({
        ip: clientIp,
        route: "/api/auth/signup",
        timestamp: now,
      });
    } else {
      // Optional: Decide how to handle requests without identifiable IP
      console.warn("Could not determine client IP for rate limiting signup.");
      // Depending on policy, you might block, allow, or use a different strategy.
      // For now, we proceed but log a warning.
    }
    // --- End Rate Limiting Check ---

    const { name, email, password } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Server-side email format validation
    if (!EMAIL_REGEX.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Server-side password complexity validation
    if (!PASSWORD_REGEX.test(password)) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long and include uppercase, lowercase, number, and special character." },
        { status: 400 }
      );
    }

    // Convert email to lowercase for case-insensitive uniqueness check
    const normalizedEmail = email.toLowerCase();

    // Check if user already exists
    const existingUser = await usersCollection.findOne({ email: normalizedEmail });

    if (existingUser) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 400 }
      );
    }

    // Hash the password securely
    const hashedPassword = await bcrypt.hash(password, 12);

    // Insert new user
    const timestamp = new Date();
    const newUser = {
      name,
      email: normalizedEmail,
      password: hashedPassword,
      createdAt: timestamp,
      updatedAt: timestamp,
      isActive: true, // Set default isActive status
      role: "user",   // Set default role
      loginHistory: [], // Initialize empty arrays
      passwordHistory: [],
    };

    const result = await usersCollection.insertOne(newUser);

    if (!result.acknowledged) {
      throw new Error("Database insert failed");
    }

    return NextResponse.json(
      {
        message: "User registered successfully",
        user: {
          id: result.insertedId.toString(),
          name,
          email: normalizedEmail,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
