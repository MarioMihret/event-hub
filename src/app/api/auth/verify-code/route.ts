import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { randomBytes } from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const { email, code, type = 'password-reset' } = await req.json();

    if (!email || !code) {
      return NextResponse.json(
        { error: 'Email and code are required' },
        { status: 400 }
      );
    }

    const db = await connectDB();
    const verificationRecord = await db.collection('verificationCodes').findOne({
      email: email.toLowerCase(),
      type
    });

    if (!verificationRecord) {
      return NextResponse.json(
        { error: 'Verification code not found' },
        { status: 400 }
      );
    }

    if (verificationRecord.attempts >= 3) {
      return NextResponse.json(
        { error: 'Maximum attempts exceeded. Please request a new code.' },
        { status: 400 }
      );
    }

    if (new Date() > new Date(verificationRecord.expiresAt)) {
      return NextResponse.json(
        { error: 'Verification code has expired. Please request a new code.' },
        { status: 400 }
      );
    }

    if (verificationRecord.code !== code) {
      await db.collection('verificationCodes').updateOne(
        { email: email.toLowerCase(), type },
        { $inc: { attempts: 1 } }
      );

      const remainingAttempts = 2 - verificationRecord.attempts;
      return NextResponse.json(
        { 
          error: 'Invalid verification code',
          remainingAttempts: remainingAttempts > 0 ? remainingAttempts : 0
        },
        { status: 400 }
      );
    }

    // Generate a reset token for password reset
    let resetToken = null;
    if (type === 'password-reset') {
      resetToken = randomBytes(32).toString('hex');
      const resetTokenExpiry = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

      await db.collection('resetTokens').insertOne({
        email: email.toLowerCase(),
        token: resetToken,
        expiresAt: resetTokenExpiry,
        createdAt: new Date()
      });
    }

    await db.collection('verificationCodes').updateOne(
      { email: email.toLowerCase(), type },
      { 
        $set: { 
          verified: true,
          verifiedAt: new Date()
        } 
      }
    );

    return NextResponse.json({ 
      success: true,
      resetToken: resetToken ? {
        token: resetToken,
        expiresIn: '30 minutes'
      } : undefined
    });
  } catch (error) {
    console.error('Verify code error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}