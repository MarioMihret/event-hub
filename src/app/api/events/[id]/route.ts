import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { eventService } from '@/lib/services/eventService';
import { connectDB } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import type { Event, EventVisibilityType } from '@/types/event';

/**
 * Helper function to transform event data
 * Handles conversions from ObjectId to string and Date to ISO string
 */
function transformEvent(event: any): any {
  if (!event) return null;
  
  // Create a shallow copy of the event to avoid modifying the original
  const transformed = { ...event };
  
  // Convert ObjectId to string
  if (transformed._id) {
    transformed._id = transformed._id.toString();
  }
  
  if (transformed.organizerId) {
    transformed.organizerId = typeof transformed.organizerId === 'object' && transformed.organizerId !== null
      ? transformed.organizerId.toString()
      : transformed.organizerId;
  }
  
  // Convert Date objects to ISO strings
  const dateFields = [
    'date', 
    'endDate', 
    'registrationDeadline', 
    'earlyBirdDeadline', 
    'createdAt', 
    'updatedAt'
  ];
  
  for (const field of dateFields) {
    if (transformed[field] instanceof Date) {
      transformed[field] = transformed[field].toISOString();
    }
  }
  
  // Transform nested objects with ObjectIds
  if (transformed.tickets && Array.isArray(transformed.tickets)) {
    transformed.tickets = transformed.tickets.map((ticket: any) => {
      if (ticket._id) {
        return { ...ticket, _id: ticket._id.toString() };
      }
      return ticket;
    });
  }
  
  // Ensure speakers array is properly formatted
  if (transformed.speakers && !Array.isArray(transformed.speakers)) {
    // If speakers is not an array, convert it to one
    transformed.speakers = [transformed.speakers];
  }
  
  // Ensure logo is properly formatted
  if (transformed.logo && typeof transformed.logo === 'string') {
    transformed.logo = { url: transformed.logo };
  }
  
  return transformed;
}

/**
 * ✅ GET: Fetch Event Details by ID
 */
export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
) {
  let id: string | undefined;
  try {
    const startTime = Date.now();
    id = context.params.id; // Changed from params.id
    
    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid event ID format", code: "INVALID_ID" }, { status: 400 });
    }

    // 1. Get Session Info FIRST
    const session = await getServerSession(authOptions);
    const authenticatedUser = session?.user;
    // Use .id as defined in next-auth.d.ts
    const userId = authenticatedUser?.id;
    const userEmail = authenticatedUser?.email;
    console.log(`[Events GET /id] Session retrieved. UserID: ${userId || 'undefined'}, Email: ${userEmail || 'undefined'}`);

    // Connect to database
    const db = await connectDB();

    // Define fields to include
    const projection = {
      // Default fields needed for event card and basic details
      _id: 1 as const, title: 1 as const, shortDescription: 1 as const, description: 1 as const, category: 1 as const, status: 1 as const,
      visibility: 1 as const, date: 1 as const, endDate: 1 as const, price: 1 as const, currency: 1 as const,
      location: 1 as const, isVirtual: 1 as const, streamingPlatform: 1 as const, meetingLink: 1 as const,
      image: 1 as const, organizerId: 1 as const, maxAttendees: 1 as const, attendees: 1 as const, registrationDeadline: 1 as const,
      tags: 1 as const, logo: 1 as const, speakers: 1 as const, requirements: 1 as const, targetAudience: 1 as const, skillLevel: 1 as const,
      // Explicitly include fields for ownership and registration checks if not covered
      // 'visibility.restrictedTo': 1, (already covered by default if visibility is projected)
      // Fields relevant for meeting page or other specific views
      roomName: 1 as const,
      meetingManuallyStarted: 1 as const,
    };

    // console.log('[Events GET /id] Using projection:', JSON.stringify(projection));

    // 2. Fetch Event Data
    const event = await eventService.getEventById(id, projection, false, userId);
    
    if (!event) {
      return NextResponse.json({ error: "Event not found", code: "NOT_FOUND" }, { status: 404 });
    }
    
    // --- ADD Registration Status Check --- 
    let isRegistered = false;
    if (userId && ObjectId.isValid(userId)) { // Check if user is logged in and ID is valid
        try {
            const confirmedOrder = await db.collection('orders').findOne({
                eventId: new ObjectId(id),
                userId: new ObjectId(userId),
                status: { $in: ['confirmed', 'COMPLETED'] } // Check for both confirmed and COMPLETED statuses
            });
            isRegistered = !!confirmedOrder; // Set to true if an order is found
            console.log(`[Events GET /id] Registration check for User ${userId} on Event ${id}. Found Order: ${!!confirmedOrder}`);
        } catch (dbError) {
            console.error(`[Events GET /id] Database error checking registration for User ${userId}:`, dbError);
            // Decide if you want to return an error or just proceed without registration status
        }
    }
    // ------------------------------------
    
    // 3. Check Visibility & Authorization
    // Ensure userId (string) is compared with organizerId.toString()
    const isOwner = !!userId && event && (userId === event.organizerId?.toString());
    console.log(`[Events GET /id] Ownership check. UserID: ${userId || 'undefined'}, OrganizerID: ${event?.organizerId?.toString()}, IsOwner: ${isOwner}`);

    let canAccess = false;
    const visibility = event.visibility;

    if (typeof visibility === 'string') {
        if (visibility === 'public') { 
            canAccess = true;
        } else if (visibility === 'private') {
            canAccess = isOwner;
        }
    } else if (typeof visibility === 'object' && visibility !== null) {
        const visObj = visibility;
        switch (visObj.status) {
            case 'public':
                canAccess = true;
                break;
            case 'private':
                canAccess = isOwner || (!!userEmail && Array.isArray(visObj.restrictedTo) && visObj.restrictedTo.includes(userEmail));
                break;
            default:
                 console.warn(`[Events GET /id] Unknown visibility status in event ${id}:`, visObj);
                 canAccess = isOwner;
        }
    } else {
         console.warn(`[Events GET /id] Event ${id} has unexpected visibility type: ${typeof visibility}. Defaulting to owner-only access.`);
         canAccess = isOwner;
      } 

    // --- Final Access Check --- 
    if (!canAccess) {
        console.log(`[Events GET /id] Access Denied for event ${id}. UserID: ${userId || 'undefined'}, Email: ${userEmail || 'anonymous'}. Visibility:`, visibility);
          return NextResponse.json(
              { 
                error: "Access Denied: You do not have permission to view this event.",
                  code: "UNAUTHORIZED"
              },
              { status: 403 }
          );
      }
    
    console.log(`[Events GET /id] Access Granted for event ${id}.`);

    // 4. Fetch Related Data (only if access granted)
    const [relatedEventsResult, organizerEventsResult] = await Promise.all([
      // Get related events (same category) - only if event is not private
      canAccess ? eventService.getEvents({
        filter: {
          category: event.category,
          _id: { $ne: new ObjectId(id) },
          $or: [
            { 'visibility.status': { $in: ["public", "PUBLIC"] } },
            { visibility: "public" }
          ],
          date: { $gte: new Date() }
        },
        limit: 3,
        projection: {
          title: 1,
          shortDescription: 1,
          date: 1,
          image: 1,
          price: 1,
          currency: 1,
          isVirtual: 1,
          location: 1
        }
      }) : { events: [] },

      // Get organizer's other events - only if event is not private
      canAccess ? eventService.getEvents({
        filter: {
          organizerId: typeof event.organizerId === 'string' 
            ? (ObjectId.isValid(event.organizerId) ? new ObjectId(event.organizerId) : event.organizerId) 
            : event.organizerId,
          _id: { $ne: new ObjectId(id) },
          $or: [
            { 'visibility.status': { $in: ["public", "PUBLIC"] } },
            { visibility: "public" }
          ],
          date: { $gte: new Date() }
        },
        limit: 3,
        projection: {
          title: 1,
          shortDescription: 1,
          date: 1,
          image: 1,
          price: 1,
          currency: 1,
          isVirtual: 1,
          location: 1
        }
      }) : { events: [] }
    ]);

    // 5. Prepare and Return Response
    const endTime = Date.now();
    console.log(`Event API response time: ${endTime - startTime}ms`);
    
    // Combine the main event with related data and the registration status
    const transformedMainEvent = transformEvent(event);

    // --- FIX: Add isRegistered and isOwner flags to the returned event object --- 
    transformedMainEvent.isOwner = isOwner;
    transformedMainEvent.isRegistered = isRegistered; 
    // ------------------------------------------------------------------------

    // Transform related event results
    const relatedEvents = relatedEventsResult.events.map(transformEvent);
    const organizerEvents = organizerEventsResult.events.map(transformEvent);

    return NextResponse.json({
      event: transformedMainEvent,
      relatedEvents: relatedEvents,
      organizerEvents: organizerEvents,
    });

  } catch (error: any) {
    console.error(`[Events GET /id] Error fetching event ${id || 'unknown'}:`, error); // Use id (or a fallback)
    const errorMessage = error.message || "An unexpected error occurred while fetching the event.";
    const statusCode = error.code === 'NOT_FOUND' ? 404 : error.code === 'UNAUTHORIZED' ? 403 : 500;
    return NextResponse.json(
      { 
          error: errorMessage,
          code: error.code || "INTERNAL_ERROR"
      },
      { status: statusCode }
    );
  }
}

// Process event data before sending to client
async function processEventData(event: any, userId?: string) {
  if (!event) return null;

  // Preserve isRegistered status if already set
  const isRegisteredStatus = event.isRegistered;

  // Convert ObjectId to string
  event._id = event._id.toString();
  if (event.organizerId) {
    event.organizerId = event.organizerId.toString();
  }

  // Process ticket types and availability
  if (!event.ticketTypes || event.ticketTypes.length === 0) {
    // Calculate available tickets based on maxAttendees
    const available = event.maxAttendees 
      ? Math.max(0, event.maxAttendees - (event.attendees || 0))
      : 100;

    // Create default ticket type
    event.ticketTypes = [{
      type: 'standard',
      name: 'Standard Ticket',
      price: event.price || 0,
      description: 'General admission to this event',
      available: available,
      maxPerOrder: Math.min(10, available),
      currency: event.currency || 'USD'
    }];
  } else {
    // Update available tickets based on maxAttendees if needed
    const db = await connectDB();
    const orders = await db.collection('orders').find({ 
      eventId: new ObjectId(event._id),
      status: { $in: ['confirmed', 'pending'] }
    }).toArray();
    
    // Count sold tickets by type
    const soldTickets: Record<string, number> = {};
    for (const order of orders) {
      for (const ticket of order.tickets || []) {
        soldTickets[ticket.type] = (soldTickets[ticket.type] || 0) + ticket.quantity;
      }
    }
    
    // Update availability for each ticket type
    event.ticketTypes = event.ticketTypes.map((ticket: any) => {
      const soldCount = soldTickets[ticket.type] || 0;
      let maxAvailable = Infinity;
      
      // If maxAttendees is set, limit total tickets across all types
      if (event.maxAttendees) {
        const totalSold = Object.values(soldTickets).reduce((sum: any, count: any) => sum + count, 0);
        maxAvailable = Math.max(0, event.maxAttendees - totalSold);
      }
      
      // Calculate actual availability (original allocation minus sold)
      const typeAvailable = ticket.initialQuantity 
        ? Math.max(0, ticket.initialQuantity - soldCount)
        : maxAvailable;
      
      return {
        ...ticket,
        available: Math.min(typeAvailable, maxAvailable)
      };
    });
  }
  
  // Re-apply isRegistered status after other processing
  if (isRegisteredStatus !== undefined) {
      event.isRegistered = isRegisteredStatus;
  }
  
  return event;
}

/**
 * ✅ PUT: Update an existing event
 */
export async function PUT(
  request: NextRequest,
  context: { params: { id: string } }
) {
  let id: string | undefined;
  try {
    id = context.params.id; // Changed from params.id
    
    // Validate event ID
    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json(
        { 
          error: "Invalid event ID format",
          code: "INVALID_ID"
        },
        { status: 400 }
      );
    }

    // Connect to database
    await connectDB();

    // Check if user is authenticated
    const session = await getServerSession(authOptions);
    // Use type inference from session
    const authenticatedUser = session?.user; 
    // Use session.user.id (consistent with GET and next-auth types)
    if (!authenticatedUser?.id) { 
      return NextResponse.json(
        { 
          error: "Not authenticated",
          code: "UNAUTHORIZED"
        },
        { status: 401 }
      );
    }
    // Use session.user.id
    const userId = authenticatedUser.id; 

    // Get the existing event to check ownership and check if expired
    // Pass userId to eventService.getEventById for proper authorization checks within the service
    const existingEvent = await eventService.getEventById(id, undefined, false, userId);
    if (!existingEvent) {
      return NextResponse.json(
        { 
          error: "Event not found",
          code: "NOT_FOUND"
        },
        { status: 404 }
      );
    }

    // Check if user is authorized to edit this event
    // Compare session.user.id (string) with organizerId.toString()
    const isOwner = userId === existingEvent.organizerId?.toString(); 
    if (!isOwner) {
      return NextResponse.json(
        { 
          error: "Not authorized to edit this event",
          code: "FORBIDDEN"
        },
        { status: 403 }
      );
    }
    
    // Check if event is expired
    const now = new Date();
    let isExpired = false;
    
    if (existingEvent.date) {
      const eventDate = new Date(existingEvent.date);
      
      if (existingEvent.endDate) {
        const endDate = new Date(existingEvent.endDate);
        isExpired = endDate < now;
      } else if (existingEvent.duration && typeof existingEvent.duration === 'number') {
        const endTime = new Date(eventDate.getTime() + (existingEvent.duration * 60 * 1000));
        isExpired = endTime < now;
      } else {
        isExpired = eventDate < now;
      }
    }
    
    // Parse request body
    const eventData = await request.json();
    if (!eventData || Object.keys(eventData).length === 0) {
      return NextResponse.json(
        { 
          error: "No update data provided",
          code: "EMPTY_UPDATE"
        },
        { status: 400 }
      );
    }
    
    // Allow updates if:
    // 1. Event is not expired, OR
    // 2. It's a status update specifically setting status to 'expired', OR
    // 3. It's a visibility update for an expired event (special case to fix visibility issues)
    const isStatusUpdate = eventData.status === 'expired';
    const isVisibilityUpdate = Object.keys(eventData).length === 1 && eventData.visibility !== undefined;
    
    if (isExpired && !isStatusUpdate && !isVisibilityUpdate) {
      console.log(`Server rejected edit of expired event: ${existingEvent.title} (${id})`);
      return NextResponse.json(
        {
          error: "Cannot edit expired events",
          code: "EVENT_EXPIRED"
        },
        { status: 403 }
      );
    }
    
    // Validate dates if present
    if (eventData.date) {
      const eventDate = new Date(eventData.date);
      if (isNaN(eventDate.getTime())) {
        return NextResponse.json(
          { 
            error: "Invalid event date format",
            code: "INVALID_DATE",
            field: "date"
          },
          { status: 400 }
        );
      }
    }
    
    if (eventData.endDate) {
      const endDate = new Date(eventData.endDate);
      if (isNaN(endDate.getTime())) {
        return NextResponse.json(
          { 
            error: "Invalid end date format",
            code: "INVALID_DATE",
            field: "endDate"
          },
          { status: 400 }
        );
      }
      
      // Check end date is after start date
      if (eventData.date) {
        const eventDate = new Date(eventData.date);
        if (endDate <= eventDate) {
          return NextResponse.json(
            { 
              error: "End date must be after start date",
              code: "INVALID_DATE_RANGE",
              field: "endDate"
            },
            { status: 400 }
          );
        }
      } else if (existingEvent.date) {
        const eventDate = new Date(existingEvent.date);
        if (endDate <= eventDate) {
          return NextResponse.json(
            { 
              error: "End date must be after start date",
              code: "INVALID_DATE_RANGE",
              field: "endDate"
            },
            { status: 400 }
          );
        }
      }
    }
    
    // --- START: Visibility Validation --- 
    if (eventData.visibility) { // Check if visibility is being updated
        const visUpdate = eventData.visibility;
        
        if (typeof visUpdate === 'object' && visUpdate !== null) {
            // Object validation
            const status = visUpdate.status;

            // Updated status check to exclude 'unlisted'
            if (!status || !['public', 'private'].includes(status)) { // Removed 'unlisted'
                 return NextResponse.json(
                    { error: `Invalid visibility status value: ${status}. Must be 'public' or 'private'.`, code: "INVALID_VISIBILITY_STATUS" }, { status: 400 }
                );
            }

            if (status === 'private') {
                 // Validate restrictedTo for private (if provided)
                 if (visUpdate.restrictedTo !== undefined) {
                     if (!Array.isArray(visUpdate.restrictedTo)) {
                         return NextResponse.json({ error: "Invalid format for restrictedTo (must be an array).", code: "INVALID_RESTRICTED_TO_FORMAT" }, { status: 400 });
                }
                     // Optional: Validate emails/IDs within the array
                     // if (visUpdate.restrictedTo.some(item => typeof item !== 'string')) { ... }
                 }
                 // Optional: Require restrictedTo to be non-empty for private status?
                 // if (!visUpdate.restrictedTo || visUpdate.restrictedTo.length === 0) {
                 //      return NextResponse.json({ error: "restrictedTo cannot be empty for private visibility.", code: "EMPTY_RESTRICTED_TO" }, { status: 400 });
                 // }
            }
            // No specific validation needed for 'public' or 'unlisted' objects beyond the status itself

        } else if (typeof visUpdate === 'string') {
            // String validation - updated to exclude 'unlisted'
            if (!['public', 'private'].includes(visUpdate)) { // Removed 'unlisted'
                 return NextResponse.json(
                    { error: `Invalid visibility value: ${visUpdate}. Must be 'public' or 'private'.`, code: "INVALID_VISIBILITY_STRING" }, { status: 400 }
                );
             }
            // REMOVED warning about 'scheduled' string ambiguity
            // if (visUpdate === 'scheduled') { ... }
        } else {
             // Invalid type for visibility update
             return NextResponse.json(
                { error: `Invalid visibility type provided. Must be string or object.`, code: "INVALID_VISIBILITY_TYPE" }, { status: 400 }
             );
        }
    }
    // --- END: Visibility Validation ---

    // Sanitize update data - only allow specific fields to be updated
    const allowedUpdateFields = [
      'title', 'description', 'shortDescription', 'category', 'date', 'endDate',
      'duration', 'location', 'isVirtual', 'meetingLink', 'streamingPlatform',
      'price', 'currency', 'maxAttendees', 'status', 'visibility', 'image',
      'tags', 'requirements', 'targetAudience', 'skillLevel', 'registrationDeadline',
      'earlyBirdDeadline', 'refundPolicy', 'agenda', 'tickets', 'metadata'
    ];
    
    const sanitizedUpdate = Object.keys(eventData)
      .filter(key => allowedUpdateFields.includes(key))
      .reduce((obj, key) => {
        obj[key] = eventData[key];
        return obj;
      }, {} as Record<string, any>);
    
    if (Object.keys(sanitizedUpdate).length === 0) {
      return NextResponse.json(
        { 
          error: "No valid fields to update",
          code: "INVALID_UPDATE",
          allowedFields: allowedUpdateFields
        },
        { status: 400 }
      );
    }

    // Add updated timestamp
    sanitizedUpdate.updatedAt = new Date();

    // Update event
    const updatedEvent = await eventService.updateEvent(id, sanitizedUpdate);
    if (!updatedEvent) {
      return NextResponse.json(
        { 
          error: "Failed to update event",
          code: "UPDATE_FAILED"
        },
        { status: 500 }
      );
    }
    
    // REMOVED: Get updated event data again - use the result from updateEvent
    // const updatedEventData = await eventService.getEventById(id);

    return NextResponse.json({
      message: "Event updated successfully",
      // Use the returned updatedEvent directly
      event: transformEvent(updatedEvent), 
      links: {
        self: `/api/events/${id}`,
        register: `/api/events/${id}/register`,
        tickets: `/api/events/${id}/tickets`,
      }
    });
  } catch (error) {
    console.error(`Error updating event ${id || 'unknown'}:`, error); // Use id (or a fallback)
    return NextResponse.json(
      { 
        error: "Failed to update event",
        details: (error as Error).message,
        code: "SERVER_ERROR",
        stack: process.env.NODE_ENV === 'development' ? (error as Error).stack : undefined
      },
      { status: 500 }
    );
  }
}

/**
 * ✅ DELETE: Delete an existing event
 */
export async function DELETE(
  request: NextRequest,
  context: { params: { id: string } }
) {
  let id: string | undefined;
  try {
    id = context.params.id; // Changed from params.id

    if (!id) {
      return NextResponse.json({ error: "Event ID is required", code: "MISSING_PARAM_ID" }, { status: 400 });
    }
    
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) { // Prefer session.user.id and check it directly
      return NextResponse.json({ error: "Unauthorized: User not logged in or user ID missing from session", code: "UNAUTHENTICATED" }, { status: 401 });
    }
    
    const currentUserId = session.user.id; // Use the standard session.user.id

    await connectDB();
    const event = await eventService.getEventById(id);

    if (!event) {
      return NextResponse.json({ error: "Event not found", code: "NOT_FOUND" }, { status: 404 });
    }
    
    // Ensure event.organizerId is treated as a string for comparison
    const eventOrganizerIdRaw = event.organizerId;
    const eventOrganizerId = event.organizerId?.toString();

    const isOwner = eventOrganizerId === currentUserId;
    
    // --- DETAILED LOGGING FOR DELETE ---
    console.log('[Event DELETE DEBUG] Session User:', JSON.stringify(session.user, null, 2));
    console.log('[Event DELETE DEBUG] Event Organizer ID (Raw):', eventOrganizerIdRaw);
    console.log('[Event DELETE DEBUG] Event Organizer ID (String):', eventOrganizerId);
    console.log('[Event DELETE DEBUG] Current User ID:', currentUserId);
    console.log('[Event DELETE DEBUG] Is Owner?', isOwner);
    // --- END DETAILED LOGGING ---
    
    // Allow deletion if the user is the owner
    if (!isOwner) {
      console.log(`[Event DELETE] Unauthorized attempt to delete event ${id}. User: ${currentUserId}, Organizer: ${eventOrganizerId}. Only owner can delete.`);
      return NextResponse.json({ error: "Unauthorized to delete this event. Only the event owner can perform this action.", code: "FORBIDDEN_NOT_OWNER" }, { status: 403 });
    }
    
    console.log(`[Event DELETE] Authorized to delete event ${id}. User: ${currentUserId}, IsOwner: ${isOwner}.`);
    await eventService.deleteEvent(id);
    return NextResponse.json({ message: "Event deleted successfully" }, { status: 200 });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unknown server error occurred";
    console.error(`Error deleting event ${id || 'unknown'}:`, error); // Add logging with id
    return NextResponse.json({ error: "Failed to delete event", details: errorMessage, code: "DELETE_OPERATION_FAILED" }, { status: 500 });
  }
}
