import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * POST: Update attendee count for a specific event
 * Only event owners can update this information
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Removed await, params is not a Promise
    const id = params.id; // Access id directly
    
    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid event ID' }, { status: 400 });
    }

    // Get user session for authorization
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Connect to database
    const db = await connectDB();
    
    // Get event to check ownership
    const event = await db.collection('events').findOne({ _id: new ObjectId(id) });
    
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Only the event owner can update attendee count
    const isOwner = userId === event.organizerId?.toString();
    if (!isOwner) {
      return NextResponse.json({ error: 'Only event owners can update attendance' }, { status: 403 });
    }

    // Parse request body
    const body = await request.json();
    
    if (typeof body.attendeeCount !== 'number' || body.attendeeCount < 0) {
      return NextResponse.json({ error: 'Invalid attendee count' }, { status: 400 });
    }

    // Update event with the new attendee count
    await db.collection('events').updateOne(
      { _id: new ObjectId(id) },
      { $set: { attendees: body.attendeeCount } }
    );

    return NextResponse.json({
      success: true,
      message: 'Attendee count updated successfully',
      eventId: id,
      newAttendeeCount: body.attendeeCount
    });

  } catch (error: any) {
    console.error('Error updating event attendee count:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update attendee count' },
      { status: 500 }
    );
  }
} 