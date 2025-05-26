import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import bcrypt from 'bcrypt';

function isValidEmail(email: string): boolean {
  const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailPattern.test(email);
}

export async function PUT(request: NextRequest) {
  try {
    // Extract email from headers
    const email = request.headers.get('email');
    
    if (!email || !isValidEmail(email)) {
      console.error('Unauthorized or invalid email:', email);  // Logging for debugging
      return NextResponse.json({ error: 'Unauthorized or invalid email' }, { status: 401 });
    }
    
    // Parse request body
    const data = await request.json();
    const { currentPassword, newPassword } = data;

    // Validate new password (example: minimum length)
    if (!newPassword || newPassword.length < 8) {
      console.error('New password validation failed. Password length is less than 8 characters.');  // Logging for debugging
      return NextResponse.json({ error: 'New password must be at least 8 characters long' }, { status: 400 });
    }
    
    // Connect to MongoDB
    const db = await connectDB();

    if (!db) {
      console.error('Failed to connect to MongoDB');
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }
    
    // Fetch user to verify current password
    const user = await db.collection('user').findOne({ email: email }, { projection: { password: 1 } });
    
    if (!user) {
      console.error('User not found:', email);  // Logging for debugging
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    
    if (!isPasswordValid) {
      console.error('Current password is incorrect for email:', email);  // Logging for debugging
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
    }
    
    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update user password
    const result = await db.collection('user').updateOne(
      { email: email },
      { 
        $set: { 
          password: hashedPassword,
          updatedAt: new Date()
        } 
      }
    );
    
    if (result.matchedCount === 0) {
      console.error('User not updated for email:', email);  // Logging for debugging
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    return NextResponse.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error updating password:', error);
    return NextResponse.json({ error: 'Failed to update password' }, { status: 500 });
  }
}
