import { connectDB } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';

/**
 * GET: Fetch exact attendee count for a specific event
 * Returns the number of confirmed registrations for an event
 */
export async function GET(
  _request: Request, 
  { params }: { params: { id: string } }
) {
  try {
    console.log("==== ATTENDEE API CALL STARTED ====");
    
    const id = params.id; // id from destructured params
    console.log(`Processing request for event ID: ${id}`);
    
    if (!id || !ObjectId.isValid(id)) {
      console.log(`Invalid event ID: ${id}`);
      return NextResponse.json({ error: 'Invalid event ID' }, { status: 400 });
    }

    // Get user session for authorization checks
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    console.log(`User ID from session: ${userId || 'not logged in'}`);

    // Connect to database
    const db = await connectDB();
    console.log("Database connection established");
    
    // Get event to check visibility/permissions
    const event = await db.collection('events').findOne({ _id: new ObjectId(id) });
    
    if (!event) {
      console.log(`Event not found with ID: ${id}`);
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }
    console.log(`Found event: ${event.title}`);

    // Check visibility permissions
    const isOwner = userId === event.organizerId?.toString();
    const isPublic = event.visibility === 'public' || 
                    (typeof event.visibility === 'object' && event.visibility?.status === 'public');
    
    console.log(`Event visibility check - isOwner: ${isOwner}, isPublic: ${isPublic}`);
    
    // Public events or event owners can see attendee count
    if (!isPublic && !isOwner) {
      console.log("Access denied: User not authorized to view attendance information");
      return NextResponse.json({ error: 'Not authorized to view this information' }, { status: 403 });
    }

    // Count confirmed orders for this event
    console.log(`Querying orders with eventId: ${id}, status: confirmed or COMPLETED`);
    const attendeeCount = await db.collection('orders').countDocuments({
      eventId: new ObjectId(id),
      status: { $in: ['confirmed', 'COMPLETED'] }
    });
    console.log(`Found ${attendeeCount} confirmed/completed orders for this event`);
    
    // Double check event attendees field
    console.log(`Event.attendees value from database: ${typeof event.attendees === 'number' ? event.attendees : 'not set'}`);

    // Get registration info if user is logged in
    let isRegistered = false;
    if (userId) {
      const userOrder = await db.collection('orders').findOne({
        eventId: new ObjectId(id),
        userId: new ObjectId(userId),
        status: { $in: ['confirmed', 'COMPLETED'] }
      });
      isRegistered = !!userOrder;
      console.log(`User registration status: ${isRegistered}`);
    }

    // Prepare response
    const response = {
      success: true,
      eventId: id,
      attendeeCount,
      isRegistered,
      isOwner,
    };
    
    console.log("Response being sent to client:", response);
    console.log("==== ATTENDEE API CALL COMPLETED ====");

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('Error fetching event attendee count:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch attendee count' },
      { status: 500 }
    );
  }
} 