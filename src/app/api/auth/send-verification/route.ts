import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { randomInt } from 'crypto';
import { sendEmail } from '@/utils/email';
import { getClientIp } from '@/utils/getClientIp';

// Rate Limiting Config
const VERIFICATION_LIMIT = 3; // Max 3 requests per window
const VERIFICATION_WINDOW_MS = 15 * 60 * 1000; // 15 minute window

export async function POST(req: NextRequest) {
  const clientIp = getClientIp(req);

  try {
    // Connect to database first for rate limiting
    let db;
    try {
      db = await connectDB();
    } catch (error) {
      console.error('Database connection error:', error);
      return NextResponse.json(
        { error: 'Database connection failed' },
        { status: 500 }
      );
    }
    const rateLimitCollection = db.collection('rateLimits');

    // --- Rate Limiting Check ---
    if (clientIp) {
      const now = Date.now();
      const windowStart = now - VERIFICATION_WINDOW_MS;

      const attempts = await rateLimitCollection.countDocuments({
        ip: clientIp,
        route: '/api/auth/send-verification',
        timestamp: { $gte: windowStart },
      });

      if (attempts >= VERIFICATION_LIMIT) {
        console.warn(`Rate limit exceeded for send-verification from IP: ${clientIp}`);
        return NextResponse.json(
          { error: 'Too many verification requests. Please try again later.' },
          { status: 429 } // Too Many Requests
        );
      }
      // Log the attempt *before* processing
      await rateLimitCollection.insertOne({
        ip: clientIp,
        route: '/api/auth/send-verification',
        timestamp: now,
      });
    } else {
      console.warn('Could not determine client IP for rate limiting send-verification.');
      // Decide policy - block? proceed with caution?
    }
    // --- End Rate Limiting Check ---

    // Parse request body with error handling
    let email: string;
    let type: string;
    
    try {
      const body = await req.json();
      email = body.email?.toLowerCase().trim();
      type = body.type || 'password-reset';
      
      // Debug log the email address
      console.log(`Attempting to send verification email to: ${email}`);
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    // Validate email
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: 'Valid email is required' },
        { status: 400 }
      );
    }

    // Check if user exists for password reset requests
    if (type === 'password-reset') {
      const user = await db.collection('user').findOne({ email });

      if (!user) {
        // User not found, return a generic success message for security
        console.log(`Password reset requested for non-existent email: ${email}`);
        return NextResponse.json({
          success: true,
          message: 'If an account with that email exists, a verification code has been sent.'
        });
      }
    }

    // Generate and store verification code
    const verificationCode = randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    
    console.log(`Generated verification code: ${verificationCode} for ${email}`);

    try {
      // Update or insert verification code
      await db.collection('verificationCodes').updateOne(
        { email },
        {
          $set: {
            code: verificationCode,
            type,
            expiresAt,
            attempts: 0,
            verified: false,
            createdAt: new Date()
          }
        },
        { upsert: true }
      );
      console.log(`Verification code stored in database for ${email}`);
    } catch (error) {
      console.error('Database operation error:', error);
      return NextResponse.json(
        { error: 'Failed to store verification code' },
        { status: 500 }
      );
    }

    // Prepare email content
    const emailSubject = type === 'password-reset' 
      ? 'Your Password Reset Code - User Organizer'
      : 'Your Verification Code - User Organizer';

    const emailText = type === 'password-reset'
      ? `You requested to reset your password. Your verification code is: ${verificationCode}. This code will expire in 15 minutes. If you did not request this, please ignore this email.`
      : `Your verification code is: ${verificationCode}. This code will expire in 15 minutes.`;

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h1 style="color: #5b21b6; margin-bottom: 20px;">${emailSubject}</h1>
        <p style="font-size: 16px; margin-bottom: 20px;">Here is your verification code:</p>
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; text-align: center; margin-bottom: 20px;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #5b21b6;">${verificationCode}</span>
        </div>
        <p style="color: #666;">This code will expire in 15 minutes.</p>
        ${type === 'password-reset' 
          ? '<p style="color: #666;">If you did not request this, please ignore this email.</p>' 
          : ''}
        <p style="color: #666; font-size: 0.9em; margin-top: 30px;">
          This email was sent from User Organizer application.
        </p>
      </div>
    `;

    // For debugging - show the verification code in the response
    // *** REMOVE THIS IN PRODUCTION ***
    console.log(`Attempting to send email to ${email} with code ${verificationCode}`);

    // Send email with error handling
      const emailResult = await sendEmail({
        to: email,
        subject: emailSubject,
        text: emailText,
        html: emailHtml
      });
      
      console.log('Email sending result:', emailResult);
      
    if (!emailResult.success) {
      // Email sending failed, log the error and delete the verification code
      console.error('Email sending error from sendEmail function:', emailResult.error);
      await db.collection('verificationCodes').deleteOne({ email });
      return NextResponse.json(
        { error: emailResult.error || 'Failed to send verification code due to an email issue.' },
        { status: 500 }
      );
    }
    
    // Return success without the debug code
    return NextResponse.json({ 
      success: true,
      message: 'Verification code sent successfully'
    });
  } catch (error) {
    console.error('Send verification error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}