import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { clientPromise } from '@/lib/mongodb';
import { MONGODB } from '@/constants/auth';
import { compare, hash } from 'bcryptjs';
import { PasswordHistoryEntry, UserDocument } from '@/types/auth';
import { Collection } from 'mongodb';

// Import the password regex (assuming it's defined elsewhere or define here)
// Let's define it here for simplicity, ensure it matches signup/reset routes
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{8,}$/;

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await req.json();
    const { currentPassword, newPassword } = data;

    // Validate inputs
    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate new password complexity
    if (!PASSWORD_REGEX.test(newPassword)) {
      return NextResponse.json(
        { error: 'New password must be at least 8 characters long and include uppercase, lowercase, number, and special character.' }, 
        { status: 400 }
      );
    }

    // Connect to database
    const client = await clientPromise;
    const db = client.db(MONGODB.dbName);
    const userCollection: Collection<UserDocument> = db.collection(MONGODB.collections.users);

    // Get the user
    const user = await userCollection.findOne({ email: session.user.email });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user has a password set (might be OAuth user)
    if (!user.password) {
        return NextResponse.json({ error: 'Password cannot be changed for this account type (e.g., OAuth user).' }, { status: 400 });
    }

    // Verify current password
    const isPasswordValid = await compare(currentPassword, user.password);

    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
    }

    // Hash the new password (use 12 rounds)
    const hashedPassword = await hash(newPassword, 12);

    // Update the password and push to history
    await userCollection.updateOne(
      { email: session.user.email },
      {
        $set: {
          password: hashedPassword,
          updatedAt: new Date()
        },
        $push: { // Add to password history
          passwordHistory: {
            password: hashedPassword,
            changedAt: new Date()
          } as PasswordHistoryEntry // Cast to specific type
        }
      }
    );

    return NextResponse.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error updating password:', error);
    return NextResponse.json({ error: 'Failed to update password' }, { status: 500 });
  }
} 