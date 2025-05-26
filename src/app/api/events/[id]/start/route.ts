import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth'; 
import { getCollection } from '@/lib/mongodb'; 
import { Event as EventType } from '@/types/event'; // Frontend Event type
import { ObjectId, WithId, Document } from 'mongodb';

export const dynamic = 'force-dynamic';

// Backend-specific type where _id and organizerId are ObjectId
// It should include all fields of EventType, with _id and organizerId overridden.
interface EventDocument extends Omit<EventType, '_id' | 'organizerId' | 'meetingManuallyStarted'>, Document {
  _id: ObjectId;
  organizerId: ObjectId;
  meetingManuallyStarted?: boolean; // Ensure this is part of the DB model type
  // Add other fields that are ObjectId in DB but string in EventType if any
}

export async function POST(
  request: NextRequest,
  context: { params: { id: string } }
) {
  let eventIdString: string | undefined;
  try {
    eventIdString = context.params.id;

    if (!eventIdString) {
      console.error('[API EVENT START] Critical: eventId is missing from params.');
      return NextResponse.json({ error: "Event ID is missing from request parameters." }, { status: 400 });
    }

    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!ObjectId.isValid(eventIdString)) { // Validate the derived/fallback eventIdString
      return NextResponse.json({ error: `Valid Event ID is missing or invalid (received: ${eventIdString})` }, { status: 400 });
    }

    const eventsCollection = await getCollection<EventDocument>("events");
    const eventObjectId = new ObjectId(eventIdString);

    const event: WithId<EventDocument> | null = await eventsCollection.findOne({ _id: eventObjectId });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    if (event.organizerId.toHexString() !== session.user.id) { 
      return NextResponse.json({ error: "Forbidden: Not the event organizer" }, { status: 403 });
    }

    const updateResult = await eventsCollection.updateOne(
      { _id: eventObjectId },
      { $set: { meetingManuallyStarted: true } } 
    );

    if (updateResult.modifiedCount === 0 && updateResult.matchedCount === 0) {
        return NextResponse.json({ error: "Event not found during update attempt." }, { status: 404 });
    }
    
    const updatedDbEvent = await eventsCollection.findOne({ _id: eventObjectId });

    if (!updatedDbEvent) {
      return NextResponse.json({ error: "Failed to retrieve event after update." }, { status: 500 });
    }

    // Transform to client-facing EventType before sending
    // Spread all properties from updatedDbEvent (which is EventDocument)
    // Then explicitly overwrite fields that need transformation (ObjectId to string)
    // This assumes that all other fields in EventDocument are compatible with EventType
    const clientEvent: EventType = {
      ...(updatedDbEvent as any), // Use 'as any' for spread, then strongly type overrides
      _id: updatedDbEvent._id.toHexString(),
      organizerId: updatedDbEvent.organizerId.toHexString(),
      // meetingManuallyStarted should be correctly typed from EventDocument now
    };

    if (updateResult.modifiedCount === 0 && updateResult.matchedCount === 1) {
        console.log(`[API EVENT START /${eventIdString}] Event already marked as started or no change made.`);
        return NextResponse.json({ message: "Meeting was already started or no change needed.", event: clientEvent }, { status: 200 });
    }

    return NextResponse.json({ message: "Meeting started successfully", event: clientEvent }, { status: 200 });

  } catch (error) {
    const idForErrorLog = eventIdString || context.params?.id || "unknown_id_from_params";
    console.error(`[API EVENT START /${idForErrorLog}] Error:`, error);
    let errorMessage = "Internal Server Error";
    if (error instanceof Error) {
        errorMessage = error.message;
    }
    return NextResponse.json({ error: "Failed to start meeting", details: errorMessage }, { status: 500 });
  }
}

// Ensure your Event type in @/types/event.ts includes 'meetingManuallyStarted?: boolean;'.
// Ensure your Event schema in MongoDB allows for 'meetingManuallyStarted: Boolean'.
// Also, ensure that your GET /api/events/[id] route includes this field in its response
// so the polling mechanism on the client can detect the change. 