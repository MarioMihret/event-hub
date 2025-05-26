import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';

// Basic email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Server-side email format validation
    if (!EMAIL_REGEX.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    const db = await connectDB();
    const user = await db.collection('user').findOne({ 
      email: email.toLowerCase() 
    });

    return NextResponse.json({ exists: !!user });
  } catch (error) {
    console.error('Check email error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}