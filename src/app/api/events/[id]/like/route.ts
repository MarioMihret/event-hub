import { NextRequest, NextResponse } from 'next/server';
import { eventService } from '@/lib/services/eventService';
import { ObjectId } from 'mongodb';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { User } from 'next-auth';

export async function PATCH(request: NextRequest, context: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized: User not logged in.' }, { status: 401 });
  }
  const user = session.user as User;
  if (!user.id) { // Ensure user.id is present
    return NextResponse.json({ error: 'Unauthorized: User ID not found in session.' }, { status: 401 });
  }

  const eventId = context.params.id;

  if (!eventId || !ObjectId.isValid(eventId)) {
    return NextResponse.json({ error: 'Invalid event ID format.' }, { status: 400 });
  }

  try {
    const success = await eventService.likeEvent(eventId, user.id);
    if (success) {
      return NextResponse.json({ message: 'Event liked successfully.' }, { status: 200 });
    } else {
      // This could mean already liked or event not found by service for incrementing
      return NextResponse.json({ error: 'Failed to like event. Event may already be liked or not found.' }, { status: 409 }); // 409 Conflict for already liked
    }
  } catch (error: any) {
    console.error(`Error liking event ${eventId} for user ${user.id}:`, error);
    return NextResponse.json({ error: 'Failed to like event.', details: error.message }, { status: 500 });
  }
} 