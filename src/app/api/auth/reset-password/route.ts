import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { hash } from 'bcryptjs';
import type { UserDocument } from '@/types/auth';

// Requires: 8+ chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{8,}$/;

export async function POST(req: NextRequest) {
  try {
    const { email, password, token } = await req.json();

    if (!email || !password || !token) {
      return NextResponse.json(
        { error: 'Email, password, and reset token are required' },
        { status: 400 }
      );
    }

    // Validate password strength/complexity
    if (!PASSWORD_REGEX.test(password)) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long and include uppercase, lowercase, number, and special character.' },
        { status: 400 }
      );
    }

    const db = await connectDB();
    
    // Explicitly type the collections
    const usersCollection = db.collection<UserDocument>('user');
    const resetTokensCollection = db.collection('resetTokens');
    const verificationCodesCollection = db.collection('verificationCodes');

    // Verify reset token
    const resetTokenRecord = await resetTokensCollection.findOne({
      email: email.toLowerCase(),
      token,
      used: { $ne: true }
    });

    if (!resetTokenRecord) {
      return NextResponse.json(
        { error: 'Invalid or expired reset token' },
        { status: 400 }
      );
    }

    if (new Date() > new Date(resetTokenRecord.expiresAt)) {
      return NextResponse.json(
        { error: 'Reset token has expired. Please request a new password reset.' },
        { status: 400 }
      );
    }

    // Hash the new password
    const hashedPassword = await hash(password, 12);

    // Update the user's password
    const result = await usersCollection.updateOne(
      { email: email.toLowerCase() },
      { 
        $set: { 
          password: hashedPassword,
          updatedAt: new Date()
        },
        $push: {
          passwordHistory: {
            password: hashedPassword,
            changedAt: new Date()
          }
        }
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Mark the reset token as used
    await resetTokensCollection.updateOne(
      { email: email.toLowerCase(), token },
      { 
        $set: { 
          used: true,
          usedAt: new Date()
        } 
      }
    );

    // Clean up verification codes
    await verificationCodesCollection.deleteOne({
      email: email.toLowerCase(),
      type: 'password-reset'
    });

    return NextResponse.json({ 
      success: true,
      message: 'Password has been reset successfully'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}