export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import { Collection, ObjectId, WithId, Document } from 'mongodb';
import { eventService } from '@/lib/services/eventService';
import { User } from 'next-auth';
import type { Event as EventType } from '@/types/event';
import type { OrderDocument } from '@/app/api/orders/rsvp/route';
import type { User as NextAuthUser } from 'next-auth';

// Extend NextAuthUser to include id if it's not guaranteed
interface AppUser extends NextAuthUser {
  id: string;
  name?: string | null; // Ensure name is part of the type for userDisplayName
}

// Define an interface that extends EventType with fields expected to be populated by the DB query
// and used within this API route. The base EventType should have _id as string if that's the general contract.
// However, WithId<T> will make event._id an ObjectId.
interface PopulatedEvent extends EventType {
    createdBy?: string | ObjectId; 
    meetingPlatform?: string;
    roomName?: string;
    // Ensure all fields from EventType that are used are listed or inherited
    // title, date, isVirtual, location, meetingLink are assumed to be in EventType
}

// Helper to extract room slug from JaaS URL
function extractRoomSlugFromJaaSUrl(jaasUrl: string): string | null {
  try {
    const url = new URL(jaasUrl);
    if (url.hostname === '8x8.vc') {
      const parts = url.pathname.split('/');
      if (parts.length >= 2) { 
        return parts[parts.length -1]; 
      }
    }
  } catch (error) {
    console.error('Error parsing JaaS URL for room slug:', error);
  }
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const typedUser = session?.user as AppUser | undefined;

    if (!typedUser?.id) {
      console.error('[API /verify-and-fetch-event-details] User not authenticated.');
      return NextResponse.json({ message: 'Authentication required.' }, { status: 401 });
    }
    const sessionUserId = new ObjectId(typedUser.id);

    const { searchParams } = new URL(request.url);
    const eventIdParam = searchParams.get('eventId');
    const orderIdParam = searchParams.get('orderId');

    if (!eventIdParam || !ObjectId.isValid(eventIdParam)) {
      return NextResponse.json({ message: 'Valid eventId is required.' }, { status: 400 });
    }
    if (!orderIdParam || !ObjectId.isValid(orderIdParam)) {
      return NextResponse.json({ message: 'Valid orderId is required.' }, { status: 400 });
    }

    const eventId = new ObjectId(eventIdParam);
    const orderId = new ObjectId(orderIdParam);

    const db = await connectDB();
    const ordersCollection = db.collection<OrderDocument>('orders');
    // Use base EventType for collection, result will be WithId<EventType>
    const eventsCollection = db.collection<EventType>('events'); 

    const order = await ordersCollection.findOne({ _id: orderId });

    if (!order) {
      return NextResponse.json({ message: 'Order not found.' }, { status: 404 });
    }

    if (!order.eventId.equals(eventId)) {
      return NextResponse.json({ message: 'Order does not belong to the specified event.' }, { status: 403 });
    }
    if (!order.userId.equals(sessionUserId)) {
      // If events can be public and accessed by anyone with a valid order, this check might be different.
      // For now, assuming order must belong to the authenticated user.
      console.warn(`[API /verify-and-fetch-event-details] Order ${orderIdParam} userId ${order.userId.toString()} does not match session userId ${sessionUserId.toString()}`);
      return NextResponse.json({ message: 'You do not have permission to view this order.' }, { status: 403 });
    }
    if (order.status !== 'COMPLETED') {
        // Potentially allow access for other statuses if needed, e.g. pending if payment is being verified by another means.
        console.warn(`[API /verify-and-fetch-event-details] Order ${orderIdParam} has status ${order.status}, not COMPLETED.`);
        return NextResponse.json({ message: `Order status is ${order.status}. Access denied.` }, { status: 403 });
    }

    const event = await eventsCollection.findOne({ _id: eventId as any }); 

    if (!event) {
      return NextResponse.json({ message: 'Event not found.' }, { status: 404 });
    }
    
    // Cast the fetched event (which is WithId<EventType>) to WithId<PopulatedEvent>
    // This assumes EventType has the base fields and PopulatedEvent adds optional ones.
    const populatedEvent = event as WithId<PopulatedEvent>; 

    let isModerator = false;
    if (populatedEvent.createdBy) {
        const createdByObjectId = typeof populatedEvent.createdBy === 'string' 
            ? new ObjectId(populatedEvent.createdBy) 
            : populatedEvent.createdBy;
        if (createdByObjectId instanceof ObjectId && createdByObjectId.equals(sessionUserId)) {
            isModerator = true;
        }
    }
    
    const userDisplayName = typedUser.name || `${order.firstName} ${order.lastName}`;

    const responsePayload = {
      eventId: populatedEvent._id.toString(), // _id from WithId is ObjectId
      eventTitle: populatedEvent.title,
      eventDate: populatedEvent.date, 
      email: order.email,
      amount: order.amount,
      firstName: order.firstName,
      lastName: order.lastName,
      orderId: order._id.toString(),
      isVirtual: populatedEvent.isVirtual,
      location: populatedEvent.location,
      meetingLink: populatedEvent.isVirtual ? populatedEvent.meetingLink : null,
      roomName: (populatedEvent.meetingPlatform?.toUpperCase() === 'JITSI') && populatedEvent.isVirtual
                  ? populatedEvent.roomName || populatedEvent._id.toString()
                  : undefined,
      userId: sessionUserId.toString(),
      isModerator: isModerator,
      userDisplayName: userDisplayName,
      meetingPlatform: populatedEvent.meetingPlatform || (populatedEvent.isVirtual ? 'Online' : 'Physical'),
      registered: true, // Always true if we get here, since we verified the order exists and is complete
      registrationDate: order.createdAt || new Date().toISOString(),
      tickets: order.tickets || [{ name: 'Event Registration', quantity: 1, price: 0 }],
      ticketCount: order.tickets ? order.tickets.reduce((total, ticket) => total + ticket.quantity, 0) : 1
    };

    // Check for missing meeting information
    if (populatedEvent.isVirtual && (!populatedEvent.meetingLink || populatedEvent.meetingLink === 'https://example.com/meeting')) {
      console.warn(`[API /verify-and-fetch-event-details] Event ${eventIdParam} is virtual but has invalid meeting link: ${populatedEvent.meetingLink}`);
      responsePayload.meetingLink = null;
      // Instead of failing, we'll return a response with meetingLink as null and let the client handle it
    }

    return NextResponse.json(responsePayload, { status: 200 });

  } catch (error: any) {
    console.error('[API /verify-and-fetch-event-details] Error:', error);
    return NextResponse.json({ message: 'Internal Server Error', details: error.message }, { status: 500 });
  }
} 