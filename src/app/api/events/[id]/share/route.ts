import { NextRequest, NextResponse } from 'next/server';
import { eventService } from '@/lib/services/eventService';
import { ObjectId } from 'mongodb';

export async function PATCH(request: NextRequest, context: { params: { id: string } }) {
  const eventId = context.params.id;

  if (!eventId || !ObjectId.isValid(eventId)) {
    return NextResponse.json({ error: 'Invalid event ID format.' }, { status: 400 });
  }
  try {
    const success = await eventService.incrementShareCount(eventId);
    if (success) {
      return NextResponse.json({ message: 'Share count incremented' }, { status: 200 });
    } else {
      return NextResponse.json({ error: 'Failed to increment share count, event not found or no change made.' }, { status: 404 });
    }
  } catch (error: any) {
    console.error(`Error incrementing share count for event ${eventId}:`, error);
    return NextResponse.json({ error: 'Failed to increment share count.', details: error.message }, { status: 500 });
  }
} 