import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { eventService } from '@/lib/services/eventService';
import { connectDB } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id: eventId } = body; // Expecting { "id": "..." } in the body

    if (!eventId || !ObjectId.isValid(eventId)) {
      return NextResponse.json({ error: "Invalid or missing event ID in request body", code: "INVALID_ID" }, { status: 400 });
    }

    const session = await getServerSession(authOptions);
    const authenticatedUser = session?.user;
    const userId = authenticatedUser?.id;

    console.log(`[POST /api/events/delete] Attempting to delete event ID: ${eventId} by User ID: ${userId || 'undefined'}`);

    if (!userId) {
      console.error("[POST /api/events/delete] Authentication check failed: No authenticatedUser.id found.");
      return NextResponse.json(
        { error: "Not authenticated", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const event = await eventService.getEventById(eventId);
    if (!event) {
      console.log(`[POST /api/events/delete] Event ${eventId} not found.`);
      return NextResponse.json(
        { error: "Event not found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    await connectDB(); // Ensure DB connected

    // --- Detailed Logging for Ownership Check ---
    console.log(`[POST /api/events/delete] Preparing for ownership check for event ID: ${eventId}`);
    console.log(`  Session User ID (userId): "${userId}" (Type: ${typeof userId})`);
    console.log(`  Event Organizer ID (event.organizerId): "${event.organizerId}" (Type: ${typeof event.organizerId})`);
    
    const eventOrganizerIdAsString = event.organizerId?.toString();
    console.log(`  Event Organizer ID (event.organizerId.toString()): "${eventOrganizerIdAsString}" (Type: ${typeof eventOrganizerIdAsString})`);
    
    const comparisonResult = eventOrganizerIdAsString === userId;
    console.log(`  Comparison (event.organizerId.toString() === userId): ${comparisonResult}`);
    // --- End Detailed Logging ---

    if (event.organizerId?.toString() !== userId) {
      console.log(`[POST /api/events/delete] Ownership check failed for user ${userId}. Event owned by ${eventOrganizerIdAsString}.`);
      return NextResponse.json(
        { error: "Unauthorized to delete this event", code: "FORBIDDEN" },
        { status: 403 }
      );
    }

    console.log(`[POST /api/events/delete] Ownership check passed. Checking attendees for event ${eventId}...`);
    const attendeesCount = typeof event.attendees === 'number' ? event.attendees : 0;
    if (attendeesCount > 0) {
      console.log(`[POST /api/events/delete] Cannot delete event ${eventId} as it has ${attendeesCount} attendees.`);
      return NextResponse.json(
         { error: "Cannot delete an event with attendees. Please cancel the event instead.", code: "HAS_ATTENDEES", suggestion: "Update the event status to 'cancelled' instead of deleting it", attendees: attendeesCount },
        { status: 400 }
      );
    }
    console.log(`[POST /api/events/delete] Attendee check passed for event ${eventId}. Attempting deletion...`);

    const deleted = await eventService.deleteEvent(eventId);
    if (!deleted) {
      console.log(`[POST /api/events/delete] eventService.deleteEvent(${eventId}) failed.`);
      return NextResponse.json(
        { error: "Failed to delete event", code: "DELETE_FAILED" },
        { status: 500 }
      );
    }

    console.log(`[POST /api/events/delete] Event ${eventId} deleted successfully.`);
    return NextResponse.json({ message: "Event deleted successfully", code: "DELETED" }, { status: 200 });

  } catch (error) {
    console.error("[POST /api/events/delete] Error deleting event:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json(
      { 
        error: "Failed to delete event",
        details: errorMessage,
        code: "SERVER_ERROR",
        stack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
} 