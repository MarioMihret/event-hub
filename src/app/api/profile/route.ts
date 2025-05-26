import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { clientPromise } from '@/lib/mongodb';
import { MONGODB } from '@/constants/auth';
import bcrypt from 'bcrypt';

// Email validation function
function isValidEmail(email: string): boolean {
  const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z0-9]{2,}$/;
  return emailPattern.test(email);
}

// PUT Request for updating the password
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await req.json();
    const { name, bio, notificationSettings, image } = data;

    // Validate data
    if (name === undefined && bio === undefined && notificationSettings === undefined && image === undefined) {
      return NextResponse.json({ error: 'No data to update' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(MONGODB.dbName);
    const userCollection = db.collection(MONGODB.collections.users);
    const profileCollection = db.collection(MONGODB.collections.profiles);

    // Get the user to find their ID
    const user = await userCollection.findOne({ email: session.user.email });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userId = user._id.toString();

    // Check if profile exists
    const existingProfile = await profileCollection.findOne({ userId });

    // Create update object for profile
    const profileData: Record<string, any> = {
      userId,
      updatedAt: new Date()
    };
    
    if (bio !== undefined) profileData.bio = bio;
    if (notificationSettings !== undefined) profileData.notificationSettings = notificationSettings;
    if (image !== undefined) profileData.customImage = image;

    // Update profile data - upsert means create if doesn't exist
    await profileCollection.updateOne(
      { userId },
      { $set: profileData },
      { upsert: true }
    );

    // Update name in user collection if provided
    if (name !== undefined) {
      await userCollection.updateOne(
        { _id: user._id },
        { $set: { name } }
      );
    }

    // Get the updated user and profile data
    const updatedUser = await userCollection.findOne({ _id: user._id });
    const updatedProfile = await profileCollection.findOne({ userId });

    // Combine user and profile data
    const combinedData = {
      ...updatedUser,
      ...(updatedProfile || {}),
      googleName: session.user.name // Keep original Google name
    };

    // Remove sensitive information - use a safer approach without destructuring
    const safeUserData = { ...combinedData };
    // Delete password if it exists
    if ('password' in safeUserData) {
      delete safeUserData.password;
    }

    return NextResponse.json({ 
      success: true,
      user: safeUserData 
    }, { status: 200 });
  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE Request for deleting the user account
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const client = await clientPromise;
    const db = client.db(MONGODB.dbName);
    const userCollection = db.collection(MONGODB.collections.users);
    const profileCollection = db.collection(MONGODB.collections.profiles);

    // Get the user to find their ID
    const user = await userCollection.findOne({ email: session.user.email });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userId = user._id.toString();

    // Delete profile data first
    await profileCollection.deleteOne({ userId });

    // Delete user account
    await userCollection.deleteOne({ email: session.user.email });

    return NextResponse.json({ 
      success: true,
      message: 'Account deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting account:', error);
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const client = await clientPromise;
    const db = client.db(MONGODB.dbName);
    const userCollection = db.collection(MONGODB.collections.users);
    const profileCollection = db.collection(MONGODB.collections.profiles);

    // Get basic user data
    const user = await userCollection.findOne({ email: session.user.email });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get profile data
    const profile = await profileCollection.findOne({ userId: user._id.toString() });

    // Combine user and profile data
    const userData = {
      _id: user._id,
      email: user.email,
      name: user.name,
      googleName: user.name, // Store original Google name
      image: user.image,
      createdAt: user.createdAt,
      ...profile
    };

    // Remove sensitive information - use a safer approach without destructuring
    const safeUserData = { ...userData };
    // Delete password if it exists
    if ('password' in safeUserData) {
      delete safeUserData.password;
    }

    return NextResponse.json({ 
      user: safeUserData 
    }, { status: 200 });
  } catch (error) {
    console.error('Profile API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
