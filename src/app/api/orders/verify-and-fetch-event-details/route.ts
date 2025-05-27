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
    const eventId = new ObjectId(eventIdParam);
    const db = await connectDB();
    const eventsCollection = db.collection<EventType>('events');
    const event = await eventsCollection.findOne({ _id: eventId as any });

    if (!event) {
      return NextResponse.json({ message: 'Event not found.' }, { status: 404 });
    }
    const populatedEvent = event as WithId<PopulatedEvent>;

    // Organizer Access Path (if orderId is missing)
    if (!orderIdParam) {
      console.log(`[API /verify-and-fetch-event-details] OrderId not provided. Checking for organizer access for event ${eventIdParam} and user ${sessionUserId.toString()}`);
      
      // Determine organizerId field (could be createdBy or organizerId)
      // Prefer a dedicated organizerId field if it exists on your EventType
      let eventOrganizerId: ObjectId | undefined = undefined;
      if (populatedEvent.organizerId) {
          eventOrganizerId = typeof populatedEvent.organizerId === 'string' ? new ObjectId(populatedEvent.organizerId) : populatedEvent.organizerId;
      } else if (populatedEvent.createdBy) { // Fallback to createdBy if organizerId is not present
          eventOrganizerId = typeof populatedEvent.createdBy === 'string' ? new ObjectId(populatedEvent.createdBy) : populatedEvent.createdBy;
      }
      
      if (eventOrganizerId && eventOrganizerId.equals(sessionUserId)) {
        console.log(`[API /verify-and-fetch-event-details] Organizer access GRANTED for event ${eventIdParam} to user ${sessionUserId.toString()}`);
        // Organizer is accessing their own event
        const organizerDisplayName = typedUser.name || `${typedUser.email}`; // Use name or fallback to email

        const responsePayload = {
          eventId: populatedEvent._id.toString(),
          eventTitle: populatedEvent.title,
          eventDate: populatedEvent.date,
          email: typedUser.email, // Organizer's email
          // Amount, firstName, lastName, orderId are not relevant for organizer direct access
          // Set them to null or omit if client can handle missing fields
          amount: 0, 
          firstName: organizerDisplayName.split(' ')[0] || 'Organizer',
          lastName: organizerDisplayName.split(' ').slice(1).join(' ') || '',
          orderId: null, // Explicitly null for organizer
          isVirtual: populatedEvent.isVirtual,
          location: populatedEvent.location,
          meetingLink: populatedEvent.isVirtual ? populatedEvent.meetingLink : null,
          roomName: (populatedEvent.meetingPlatform?.toUpperCase() === 'JITSI') && populatedEvent.isVirtual
                      ? populatedEvent.roomName || populatedEvent._id.toString()
                      : undefined,
          userId: sessionUserId.toString(),
          isModerator: true, // Organizer is always a moderator
          userDisplayName: organizerDisplayName,
          meetingPlatform: populatedEvent.meetingPlatform || (populatedEvent.isVirtual ? 'Online' : 'Physical'),
          registered: true, // Organizer is implicitly "registered"
          registrationDate: populatedEvent.createdAt || new Date().toISOString(), // Use event creation date
          tickets: [], // No specific tickets for organizer in this context
          ticketCount: 0,
        };
        return NextResponse.json(responsePayload, { status: 200 });
      } else {
        console.warn(`[API /verify-and-fetch-event-details] Organizer access DENIED for event ${eventIdParam}. User ${sessionUserId.toString()} is not the organizer (${eventOrganizerId?.toString()}).`);
        return NextResponse.json({ message: 'Access Denied. You are not the organizer of this event and no valid order ID was provided.' }, { status: 403 });
      }
    }

    // Attendee Access Path (if orderId is provided)
    // Validate orderId if it exists
    if (!ObjectId.isValid(orderIdParam)) {
      return NextResponse.json({ message: 'Valid orderId is required if provided.' }, { status: 400 });
    }
    const orderId = new ObjectId(orderIdParam);
    const ordersCollection = db.collection<OrderDocument>('orders');
    const order = await ordersCollection.findOne({ _id: orderId });

    if (!order) {
      return NextResponse.json({ message: 'Order not found.' }, { status: 404 });
    }

    if (!order.eventId.equals(eventId)) {
      return NextResponse.json({ message: 'Order does not belong to the specified event.' }, { status: 403 });
    }
    if (!order.userId.equals(sessionUserId)) {
      console.warn(`[API /verify-and-fetch-event-details] Order ${orderIdParam} userId ${order.userId.toString()} does not match session userId ${sessionUserId.toString()}`);
      return NextResponse.json({ message: 'You do not have permission to view this order.' }, { status: 403 });
    }
    if (order.status !== 'COMPLETED') {
        console.warn(`[API /verify-and-fetch-event-details] Order ${orderIdParam} has status ${order.status}, not COMPLETED.`);
        return NextResponse.json({ message: `Order status is ${order.status}. Access denied.` }, { status: 403 });
    }

    // isModerator check for attendee (could be an attendee who is also the creator)
    let isModerator = false;
    // Prefer a dedicated organizerId field if it exists on your EventType
    let eventOrganizerIdForAttendeeCheck: ObjectId | undefined = undefined;
    if (populatedEvent.organizerId) {
        eventOrganizerIdForAttendeeCheck = typeof populatedEvent.organizerId === 'string' ? new ObjectId(populatedEvent.organizerId) : populatedEvent.organizerId;
    } else if (populatedEvent.createdBy) { // Fallback to createdBy
        eventOrganizerIdForAttendeeCheck = typeof populatedEvent.createdBy === 'string' ? new ObjectId(populatedEvent.createdBy) : populatedEvent.createdBy;
    }
    if (eventOrganizerIdForAttendeeCheck && eventOrganizerIdForAttendeeCheck.equals(sessionUserId)) {
        isModerator = true;
    }
    
    const userDisplayName = typedUser.name || `${order.firstName} ${order.lastName}`;

    const responsePayload = {
      eventId: populatedEvent._id.toString(),
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
      registered: true,
      registrationDate: order.createdAt || new Date().toISOString(),
      tickets: order.tickets || [{ name: 'Event Registration', quantity: 1, price: 0 }],
      ticketCount: order.tickets ? order.tickets.reduce((total, ticket) => total + ticket.quantity, 0) : 1
    };

    if (populatedEvent.isVirtual && (!populatedEvent.meetingLink || populatedEvent.meetingLink === 'https://example.com/meeting')) {
      console.warn(`[API /verify-and-fetch-event-details] Event ${eventIdParam} is virtual but has invalid meeting link: ${populatedEvent.meetingLink}`);
      responsePayload.meetingLink = null;
    }

    return NextResponse.json(responsePayload, { status: 200 });

  } catch (error: any) {
    console.error('[API /verify-and-fetch-event-details] Error:', error);
    return NextResponse.json({ message: 'Internal Server Error', details: error.message }, { status: 500 });
  }
} 