export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { eventService } from '@/lib/services/eventService';
import { connectDB } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { EventStatus } from '@/types/event';

/**
 * GET: Handle both status filtering and real-time updates
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Check if we're fetching event status updates by IDs
    const ids = searchParams.get('ids');
    if (ids) {
      return await getEventUpdates(request);
    }
    
    // Otherwise, proceed with original functionality
    const organizerId = searchParams.get('organizerId');
    const status = searchParams.get('status') as EventStatus;

    if (!organizerId || !status) {
      return NextResponse.json(
        { 
          error: 'organizerId and status are required',
          code: 'MISSING_PARAMETERS'
        },
        { status: 400 }
      );
    }

    // Validate status
    const validStatuses: EventStatus[] = ['draft', 'upcoming', 'live', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { 
          error: 'Invalid status. Must be one of: ' + validStatuses.join(', '),
          code: 'INVALID_STATUS'
        },
        { status: 400 }
      );
    }

    // Connect to database
    await connectDB();

    const events = await eventService.getEvents({
      filter: { organizerId, status },
      projection: { title: 1, date: 1, status: 1, image: 1, category: 1 }
    });
    
    return NextResponse.json({
      events: events.events,
      count: events.total,
      status
    });
  } catch (error) {
    console.error('Error fetching events by status:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch events',
        details: (error as Error).message,
        code: 'SERVER_ERROR'
      },
      { status: 500 }
    );
  }
}

/**
 * PUT: Update event status
 */
export async function PUT(request: NextRequest) {
  try {
    // 🔒 Authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ 
        error: 'Unauthorized: You must be logged in to update event status',
        code: 'UNAUTHORIZED'
      }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId');
    const status = searchParams.get('status') as EventStatus;

    if (!eventId || !status) {
      return NextResponse.json(
        { 
          error: 'eventId and status are required',
          code: 'MISSING_PARAMETERS'
        },
        { status: 400 }
      );
    }

    // Validate event ID
    if (!ObjectId.isValid(eventId)) {
      return NextResponse.json(
        { 
          error: "Invalid event ID format",
          code: "INVALID_ID"
        },
        { status: 400 }
      );
    }

    // Validate status
    const validStatuses: EventStatus[] = ['draft', 'upcoming', 'live', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { 
          error: 'Invalid status. Must be one of: ' + validStatuses.join(', '),
          code: 'INVALID_STATUS'
        },
        { status: 400 }
      );
    }

    // Connect to database
    await connectDB();

    // Get the event first to check ownership
    const existingEvent = await eventService.getEventById(eventId);
    
    if (!existingEvent) {
      return NextResponse.json(
        { 
          error: 'Event not found',
          code: 'NOT_FOUND'
        },
        { status: 404 }
      );
    }

    // Check if user is the organizer
    if (existingEvent.organizerId.toString() !== session.user.id) {
      return NextResponse.json(
        { 
          error: 'Forbidden: You can only update events you organize',
          code: 'FORBIDDEN'
        },
        { status: 403 }
      );
    }

    // Update the event status
    const updatedEvent = await eventService.updateEvent(eventId, { status });
    
    return NextResponse.json({
      message: "Event status updated successfully",
      event: updatedEvent,
      previousStatus: existingEvent.status
    });
  } catch (error) {
    console.error('Error updating event status:', error);
    return NextResponse.json(
      { 
        error: 'Failed to update event status',
        details: (error as Error).message,
        code: 'SERVER_ERROR'
      },
      { status: 500 }
    );
  }
}

/**
 * Helper function to get real-time event updates by IDs
 */
async function getEventUpdates(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    // Use session.user from next-auth types
    const authenticatedUser = session?.user;
    if (!authenticatedUser?.id) { 
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // Use the correct string id
    const userId = authenticatedUser.id;

    // Get the event IDs from the query parameters
    const { searchParams } = new URL(req.url);
    const ids = searchParams.get('ids');

    if (!ids) {
      return NextResponse.json({ error: 'Event IDs are required' }, { status: 400 });
    }

    const eventIds = ids.split(',').map(id => {
      if (!ObjectId.isValid(id.trim())) {
        console.warn(`[getEventUpdates] Invalid ObjectId format in IDs list: ${id.trim()}`);
        // Return null or throw error, depending on desired strictness
        return null; 
      }
      return new ObjectId(id.trim());
    }).filter(id => id !== null) as ObjectId[]; // Filter out invalid IDs
    
    if (eventIds.length === 0) {
      return NextResponse.json({ error: 'No valid Event IDs provided' }, { status: 400 });
    }

    // Connect to the database (eventService might need it, or handle it internally)
    // await connectDB(); // Depending on eventService implementation

    // Create a filter for finding the events using eventService
    const filter: any = {
      _id: { $in: eventIds }
    };
    
    // Add organizerId filter. Assumes organizerId in DB is ObjectId.
    // We already validated session user ID exists.
    if (ObjectId.isValid(userId)) { 
      filter.organizerId = new ObjectId(userId);
    } else {
      // If session userId isn't an ObjectId, the user cannot own events identified by ObjectId
      // So return empty array as they can't own any of the requested events.
      console.warn(`[getEventUpdates] User ID (${userId}) is not a valid ObjectId format. Cannot fetch events by owner.`);
      return NextResponse.json([], { status: 200 }); // Return empty array
    }

    // Query using eventService
    // Use a minimal projection, assuming we just need status or basic info
    const projection: Record<string, 0 | 1> = { status: 1, title: 1, date: 1 }; 
    const { events } = await eventService.getEvents({ filter, projection });

    // Return the event data
    return NextResponse.json(events, { status: 200 });
  } catch (error) {
    console.error('Error fetching event status updates:', error);
    return NextResponse.json({ error: 'Failed to fetch event status' }, { status: 500 });
  }
}