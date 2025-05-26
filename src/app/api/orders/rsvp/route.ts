import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { connectDB, getCollection } from '@/lib/mongodb';
import { ObjectId, Document } from 'mongodb';
import type { Event } from '@/types/event';
import { TicketDocument } from '@/types/ticket';
import { eventService } from '@/lib/services/eventService';
import { User } from 'next-auth';

// Define a type for the RSVP request body, aligning with frontend
interface RsvpRequestBody {
  eventId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  orderType: "FREE_VIRTUAL_EVENT_RSVP" | "FREE_LOCATION_EVENT_RSVP"; // Specific order types
  quantity?: number; // New field for ticket quantity
  // tickets array is part of the frontend payload but less critical for backend validation here
  // as ticket details for RSVP are derived.
}

// Define a type for the Order document stored in MongoDB
export interface OrderDocument extends Document {
  _id: ObjectId;
  userId: ObjectId;
  eventId: ObjectId;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  amount: number;
  currency: string;
  status: 'COMPLETED' | 'PENDING' | 'FAILED' | 'CANCELLED'; // Added more statuses
  orderType: "FREE_VIRTUAL_EVENT_RSVP" | "FREE_LOCATION_EVENT_RSVP" | "PAID_EVENT"; // More specific
  paymentMethod?: string;
  tickets: Array<{
    ticketId: string;
    name: string;
    price: number;
    quantity: number;
  }>;
  createdAt: Date;
  updatedAt: Date;
  eventTitle?: string;
  eventDate?: string;
  isVirtual?: boolean;
  meetingLink?: string | null;
  chapaTxRef?: string; // If linking to payment
}

// Helper to validate email
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const typedUser = session?.user as User | undefined;

    if (!typedUser?.id) {
      console.error('[RSVP API Error] User not authenticated.');
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }
    const sessionUserIdString = typedUser.id;
    if (!ObjectId.isValid(sessionUserIdString)) {
      console.error(`[RSVP API Error] Invalid user ID format in session: ${sessionUserIdString}`);
      return NextResponse.json({ error: 'Invalid user session ID format.' }, { status: 500 });
    }
    const userObjectId = new ObjectId(sessionUserIdString);

    const body: RsvpRequestBody = await request.json();
    console.log("[RSVP API] Received payload:", body); // Log received payload
    const { eventId, firstName, lastName, email, phone, orderType, quantity = 1 } = body;

    if (!eventId || !firstName || !lastName || !email || !orderType) {
      console.error('[RSVP API Error] Validation failed: Missing required fields. Payload:', body);
      return NextResponse.json({ error: 'Missing required fields: eventId, firstName, lastName, email, orderType are required.' }, { status: 400 });
    }
    if (!ObjectId.isValid(eventId)) {
      console.error(`[RSVP API Error] Validation failed: Invalid eventId format. EventId: ${eventId}`);
      return NextResponse.json({ error: 'Invalid eventId format.' }, { status: 400 });
    }
    if (!isValidEmail(email)) {
        console.error(`[RSVP API Error] Validation failed: Invalid email format. Email: ${email}`);
        return NextResponse.json({ error: 'Invalid email format.' }, { status: 400 });
    }
    if (!['FREE_VIRTUAL_EVENT_RSVP', 'FREE_LOCATION_EVENT_RSVP'].includes(orderType)) {
        console.error(`[RSVP API Error] Validation failed: Invalid orderType for RSVP. OrderType: ${orderType}`);
        return NextResponse.json({ error: 'Invalid orderType for RSVP.' }, { status: 400 });
    }
    
    // Validate ticket quantity for location events
    const ticketQuantity = Math.max(1, Math.min(10, parseInt(String(quantity)) || 1));
    if (orderType === 'FREE_LOCATION_EVENT_RSVP' && (isNaN(ticketQuantity) || ticketQuantity < 1)) {
      console.error(`[RSVP API Error] Validation failed: Invalid ticket quantity: ${quantity}`);
      return NextResponse.json({ error: 'Invalid ticket quantity.' }, { status: 400 });
    }
    
    const db = await connectDB();
    const eventsCollection = db.collection<Event>('events');
    const ordersCollection = db.collection<OrderDocument>('orders');

    const eventObjectId = new ObjectId(eventId);
    const event = await eventsCollection.findOne({ _id: eventObjectId as any }); // Use as any for _id with string

    if (!event) {
      console.error(`[RSVP API Error] Event not found with ID: ${eventId}`);
      return NextResponse.json({ error: 'Event not found.' }, { status: 404 });
    }
    console.log(`[RSVP API] Fetched event: ${event.title}, isVirtual: ${event.isVirtual}`);

    // Validate event type against orderType
    if (orderType === 'FREE_VIRTUAL_EVENT_RSVP' && !event.isVirtual) {
        console.error(`[RSVP API Error] Validation failed: Order type is for virtual events, but this event (ID: ${eventId}, Title: ${event.title}) is not virtual (isVirtual: ${event.isVirtual}). Received orderType: ${orderType}`);
        return NextResponse.json({ error: 'Order type is for virtual events, but this is not a virtual event.' }, { status: 400 });
    }
    if (orderType === 'FREE_LOCATION_EVENT_RSVP' && event.isVirtual) {
        console.error(`[RSVP API Error] Validation failed: Order type is for location events, but this event (ID: ${eventId}, Title: ${event.title}) is virtual (isVirtual: ${event.isVirtual}). Received orderType: ${orderType}`);
        return NextResponse.json({ error: 'Order type is for location events, but this is a virtual event.' }, { status: 400 });
    }

    const isActuallyFree = event.price === 0 || (event.tickets && event.tickets.length > 0 && event.tickets.every(t => t.price === 0));
    if (!isActuallyFree) {
      console.error(`[RSVP API Error] Validation failed: Event (ID: ${eventId}, Title: ${event.title}) is not free. Price: ${event.price}`);
      return NextResponse.json({ error: 'This event is not free. RSVP is only for free events.' }, { status: 400 });
    }
    
    // For virtual events, check if user already has an order
    // For location events, we'll allow multiple RSVPs for multiple tickets
    let existingOrder = null;
    if (orderType === 'FREE_VIRTUAL_EVENT_RSVP') {
      existingOrder = await ordersCollection.findOne({
        userId: userObjectId,
        eventId: eventObjectId,
        status: 'COMPLETED'
      });
    }

    if (existingOrder && orderType === 'FREE_VIRTUAL_EVENT_RSVP') {
      console.log(`[RSVP API] User ${sessionUserIdString} already has a COMPLETED order for virtual event ${eventId}. OrderId: ${existingOrder._id.toString()}`);
      return NextResponse.json({
        message: 'You have already RSVP\'d for this event.',
        orderId: existingOrder._id.toString(),
        eventTitle: event.title,
        eventDate: event.date,
        isVirtual: event.isVirtual,
        meetingLink: event.isVirtual && event.meetingLink ? event.meetingLink : null,
      }, { status: 200 });
    }

    const orderId = new ObjectId();
    const newOrderData: Omit<OrderDocument, '_id'> = {
      userId: userObjectId,
      eventId: eventObjectId,
      firstName,
      lastName,
      email,
      phone: phone || '',
      amount: 0,
      currency: event.currency || 'USD',
      status: 'COMPLETED',
      orderType: orderType, // Use the specific orderType from request
      paymentMethod: 'N/A (RSVP)',
      tickets: [{
        ticketId: 'rsvp_ticket',
        name: event.tickets?.find(t => t.price === 0)?.name || (event.isVirtual ? 'Free Virtual RSVP' : 'Free Admission'),
        price: 0,
        quantity: orderType === 'FREE_LOCATION_EVENT_RSVP' ? ticketQuantity : 1,
      }],
      createdAt: new Date(),
      updatedAt: new Date(),
      eventTitle: event.title,
      eventDate: event.date,
      isVirtual: event.isVirtual,
      meetingLink: event.isVirtual && event.meetingLink ? event.meetingLink : null,
    };

    const insertedOrder = await ordersCollection.insertOne(newOrderData as OrderDocument);
    const createdOrderId = insertedOrder.insertedId;
    console.log(`[RSVP API] Successfully created new order ${createdOrderId.toString()} for user ${sessionUserIdString}, event ${eventId}`);

    if (orderType === 'FREE_LOCATION_EVENT_RSVP' && !event.isVirtual) {
      try {
        const ticketsCollection = db.collection<TicketDocument>('tickets'); 
        const currentTime = new Date();

        // Create multiple tickets based on quantity for location events
        const ticketCreationPromises = Array.from({ length: ticketQuantity }).map((_, index) => {
          const ticketId = new ObjectId();
          
          const locationTicketDoc: Omit<TicketDocument, '_id'> = {
            orderId: createdOrderId,
            eventId: eventObjectId,
            userId: userObjectId,
            ticketHolderFirstName: firstName,
            ticketHolderLastName: lastName,
            ticketHolderEmail: email,
            ticketType: event.tickets?.find(t => t.price === 0)?.name || 'Free Admission',
            price: 0,
            currency: newOrderData.currency,
            qrCodeValue: ticketId.toString(),
            status: 'active',
            isVirtual: false,
            issuedAt: currentTime,
            updatedAt: currentTime,
          };
          
          return ticketsCollection.insertOne({ _id: ticketId, ...locationTicketDoc } as TicketDocument);
        });
        
        await Promise.all(ticketCreationPromises);
        console.log(`[RSVP API] Created ${ticketQuantity} free location-based tickets for order ${createdOrderId.toString()}`);
      } catch (ticketError) {
        console.error(`[RSVP API Error] Failed to create tickets for free location-based RSVP (order ${createdOrderId.toString()}):`, ticketError);
      }
    }

    try {
      await eventService.clearCache(eventId.toString());
      console.log(`[RSVP API] Cache cleared for event ${eventId} after successful RSVP.`);
    } catch (cacheError) {
      console.error(`[RSVP API Error] Failed to clear cache for event ${eventId} after RSVP:`, cacheError);
    }

    return NextResponse.json({
      message: 'RSVP successful!',
      orderId: createdOrderId.toString(), // Use the actual inserted ID
      // Return the full order object or parts of it as needed by the success page
      order: { ...newOrderData, _id: createdOrderId } // Send back the created order data
    }, { status: 201 });

  } catch (error: any) {
    console.error('[RSVP API General Error]', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
} 