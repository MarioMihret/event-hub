import { connectDB } from "@/lib/mongodb";
import { ObjectId, Collection, Db } from "mongodb";
import type { Event, CreateEventInput, UpdateEventInput, EventVisibilityType } from "@/types/event";
import { EventLikeDocument } from "@/types/eventLike";
import { cache } from "react";
import { getCollection } from "@/lib/mongodb";

interface GetEventsParams {
  filter?: Record<string, any>;
  limit?: number;
  page?: number;
  sort?: Record<string, 1 | -1>;
  projection?: Record<string, 1 | 0>;
  cacheKey?: string;
  skipCache?: boolean;
}

// Cache database connection to avoid repeated connections
let dbConnection: Db | null = null;
const getDbConnection = async (): Promise<Db> => {
  if (!dbConnection) {
    dbConnection = await connectDB();
  }
  return dbConnection;
};

// Simple in-memory cache with time expiration
// const queryCache = new Map<string, { data: any; timestamp: number }>(); // Commented out
// const CACHE_TTL = 60 * 1000; // 60 seconds cache TTL // Commented out

// IMPORTANT WARNING for In-Memory Cache:
// This is an IN-MEMORY query cache, NOT suitable for production environments
// with multiple server instances or serverless functions. Each instance will have its own
// cache, leading to inconsistent data and stale views.
// For production, use a distributed cache like Redis (e.g., with `ioredis`).

// Optimize by transforming only requested fields
function transformEvent(event: any, fields?: string[]): Event {
  if (!event) return event;
  
  const transformed: any = { ...event };
  
  // Convert ObjectId to string
  if (transformed._id) {
    transformed._id = transformed._id.toString();
  }
  
  if (transformed.organizerId) {
    transformed.organizerId = typeof transformed.organizerId === 'object' && transformed.organizerId !== null
      ? transformed.organizerId.toString()
      : transformed.organizerId;
  }
  
  // Convert Date objects to ISO strings (only if they exist)
  const dateFields = ['date', 'endDate', 'registrationDeadline', 'earlyBirdDeadline', 'createdAt', 'updatedAt'];
  
  for (const field of dateFields) {
    if (transformed[field] instanceof Date) {
      transformed[field] = transformed[field].toISOString();
    }
  }

  // --- BEGIN VISIBILITY TRANSFORMATION ---
  // Default to a valid public EventVisibilityType object
  let newVisibility: EventVisibilityType = { status: 'public' };
  const rawVisibility = transformed.visibility;

  if (typeof rawVisibility === 'string') {
    const statusStr = rawVisibility.toLowerCase();
    if (statusStr === 'private') {
      newVisibility = 'private';
    } else if (statusStr === 'public') {
      newVisibility = 'public';
    } else {
      // Unknown string status from DB, defaulting to public object.
      // Consider logging a warning for unexpected string values.
      console.warn(`[transformEvent] Unknown string visibility status '${rawVisibility}' for event ${transformed._id?.toString()}. Defaulting to public.`);
    }
  } else if (typeof rawVisibility === 'object' && rawVisibility !== null) {
    const visObjFromDb = rawVisibility as any; // Treat as raw object from DB
    const statusFromDb = (visObjFromDb.status || 'public').toLowerCase(); // Default status to 'public' if missing

    let restrictedToArray: string[] = [];
    if (Array.isArray(visObjFromDb.restrictedTo) && visObjFromDb.restrictedTo.every((item: any) => typeof item === 'string')) {
      restrictedToArray = visObjFromDb.restrictedTo;
    }

    if (statusFromDb === 'private') {
      // PrivateVisibility requires restrictedTo
      newVisibility = { status: 'private', restrictedTo: restrictedToArray };
      if (restrictedToArray.length === 0) {
          // This is technically allowed by the type { status: 'private', restrictedTo: string[] },
          // but often business logic expects restrictedTo to be non-empty for private.
          // Zod schema might enforce this. For transformation, we make it compliant.
          console.warn(`[transformEvent] Private visibility for event ${transformed._id?.toString()} has empty 'restrictedTo'.`);
      }
    } else if (statusFromDb === 'public') {
      const publicVis: { status: 'public'; restrictedTo?: string[] } = { status: 'public' };
      if (restrictedToArray.length > 0) {
        publicVis.restrictedTo = restrictedToArray;
      }
      newVisibility = publicVis;
    } else {
      // Unknown object status from DB (e.g., 'scheduled'), defaulting to public object.
      console.warn(`[transformEvent] Unknown object visibility status '${visObjFromDb.status}' for event ${transformed._id?.toString()}. Defaulting to public.`);
    }
  } else if (rawVisibility !== undefined && rawVisibility !== null) {
    // Visibility is present but not a string or object (e.g. number, boolean)
     console.warn(`[transformEvent] Unexpected type for visibility ('${typeof rawVisibility}') for event ${transformed._id?.toString()}. Defaulting to public.`);
  }
  // If rawVisibility was undefined or null, it will correctly use the default { status: 'public' }.

  transformed.visibility = newVisibility;
  // --- END VISIBILITY TRANSFORMATION ---
  
  // If specific fields are requested, filter the object.
  // WARNING: If 'fields' is provided and doesn't include all mandatory fields of 'Event' (including 'visibility'),
  // the 'as Event' cast below is unsafe and can lead to runtime errors.
  if (fields && fields.length > 0) {
    const filteredEvent: any = {};
    fields.forEach(field => {
      if (field in transformed) {
        filteredEvent[field] = transformed[field];
      }
    });
    return filteredEvent as Event; // Unsafe cast if 'fields' causes mandatory props to be omitted.
  }
  
  return transformed as Event; // Still potentially unsafe if 'transformed' itself is missing mandatory Event fields not set above.
}

// Helper to generate cache key
function generateCacheKey(params: any): string {
  return JSON.stringify(params);
}

export const eventService = {
  async getEvents({ 
    filter = {},
    page = 1,
    limit = 10,
    sort = { date: 1 },
    projection = {},
    cacheKey = '',
    skipCache = false
  }: GetEventsParams = {}) {
    // Caching logic commented out
    // const effectiveCacheKey = cacheKey || generateCacheKey({
    //   filter, page, limit, sort, projection
    // });
    
    // Check cache first if not skipping
    // if (!skipCache) { // Effectively always skipping cache now
    //   const cached = queryCache.get(effectiveCacheKey);
    //   if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    //     console.log(`Cache hit for query: ${effectiveCacheKey.substring(0, 50)}...`);
    //     return cached.data;
    //   }
    // }
    
    const skip = (page - 1) * limit;
    const db = await getDbConnection();
    
    console.log(`Executing DB query for: ${JSON.stringify(filter).substring(0, 100)}...`);
    
    try {
      // Performance: Use Promise.all for parallel execution
      const [events, total] = await Promise.all([
        db
          .collection("events")
          .find(filter)
          .project(projection)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .toArray(),
        db.collection("events").countDocuments(filter),
      ]);
      
      // Transform each event in the results array
      const transformedEvents = events.map(event => transformEvent(event));
      
      const result = {
        events: transformedEvents, // Use transformed events
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };
      
      // Cache the result
      // if (!skipCache) {
      //   queryCache.set(effectiveCacheKey, {
      //     data: result,
      //     timestamp: Date.now()
      //   });
      // }
      
      return result;
    } catch (error) {
      console.error('Error in getEvents:', error);
      throw error;
    }
  },

  async getEventById(id: string, projection?: Record<string, 1 | 0>, skipCache = false, userId?: string | null, userEmail?: string | null) {
    if (!ObjectId.isValid(id)) {
      console.log(`Invalid event ID format: ${id}`);
      throw new Error("Invalid event ID");
    }
    
    const eventObjectId = new ObjectId(id);

    // Modify cache key to include user registration status if userId or userEmail is provided
    // const userSpecificCacheKeyPart = userId ? `:user:${userId}` : (userEmail ? `:email:${userEmail}`: ':anon');
    // const cacheKey = `event:${id}:${JSON.stringify(projection || {})}${userSpecificCacheKeyPart}${userId ? ':inclLike' : ''}`;
    
    // if (!skipCache) { // Effectively always skipping cache now
    //   const cached = queryCache.get(cacheKey);
    //   if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    //     console.log(`Cache hit for event ${id} (User: ${userId || userEmail || 'anon'}, inclLike: ${!!userId})`);
    //     return cached.data;
    //   }
    // }

    const db = await getDbConnection();
    
    try {
      console.log(`Finding event with ID: ${id}`);
      console.log(`Using projection: ${JSON.stringify(projection || {})}`);
      
      let query;
      try {
        query = { _id: eventObjectId };
        console.log(`Query: { _id: ObjectId("${id}") }`);
      } catch (err) {
        console.error(`Error creating ObjectId for ${id}:`, err);
        throw new Error(`Invalid ObjectId format: ${id}`);
      }
      
      let event;
      try {
        const options = projection ? { projection } : undefined;
        const eventsCollection = await getCollection("events");
        event = await eventsCollection.findOne(query, options);
      } catch (dbErr) {
        console.error(`Database error when querying for event ${id}:`, dbErr);
        throw new Error(`Database error: ${dbErr.message}`);
      }

      if (!event) {
        console.log(`Event not found with ID: ${id}`);
        return null;
      }

      // Transform event data first to get consistently typed visibility
      // The transformEvent function now handles parsing DB visibility to EventVisibilityType
      const transformedEventWithVisibility = transformEvent(event);

      // --- START: Ownership and Visibility Checks (using transformed event) ---
      const isOwner = !!(userId && transformedEventWithVisibility.organizerId && transformedEventWithVisibility.organizerId.toString() === userId);

      // Access the already processed visibility from transformedEventWithVisibility
      const currentVisibility = transformedEventWithVisibility.visibility;
      let canAccess = true; // Assume public access by default

      if (typeof currentVisibility === 'string') {
        if (currentVisibility === 'private') {
          // String 'private' implies no restrictedTo list was applicable or it's an old format handled by transformEvent
          // Access depends on ownership if it was a simple 'private' string without an object structure.
          // transformEvent defaults unknown/malformed private to a proper { status: 'private', restrictedTo: [] }
          // so this path might be less common if transformEvent correctly processes things.
          // For safety, let's consider a simple string 'private' as needing ownership.
           if (!isOwner) canAccess = false;
        }
        // 'public' string allows access
      } else { // currentVisibility is EventVisibilityObject ({ status: 'public' | 'private', ... })
        if (currentVisibility.status === 'private') {
          if (!isOwner && !(userEmail && currentVisibility.restrictedTo && currentVisibility.restrictedTo.includes(userEmail))) {
            canAccess = false;
          }
        }
        // 'public' status in object allows access
      }
      
      if (!canAccess) {
        console.log(`[eventService.getEventById] Access Denied: Event ${id}. User ${userId || userEmail || 'anonymous'} lacks permissions.`);
        return null; 
      }
      console.log(`[eventService.getEventById] Access Granted: Event ${id}.`);
      // --- END: Ownership and Visibility Checks ---

      console.log(`Found event: ${transformedEventWithVisibility.title || 'Untitled'}`);
      
      let isRegistered = false;
      let userOrderId: string | null = null;
      let isLikedByCurrentUser = false;

      // 1. Check 'orders' collection using userId
      if (userId && ObjectId.isValid(userId)) {
        const userObjectId = new ObjectId(userId);
        const ordersCollection = await getCollection("orders");
        const eventLikesCollection = await getCollection<EventLikeDocument>('eventLikes');

        try {
          const rsvpOrder = await ordersCollection.findOne({
              eventId: eventObjectId,
              userId: userObjectId,
              status: 'COMPLETED'
          });
          if (rsvpOrder) {
            isRegistered = true;
            userOrderId = rsvpOrder._id.toString(); // Capture orderId
            console.log(`User ${userId} found COMPLETED order ${userOrderId} for event ${id}. Registration status: true.`);
          } else {
            console.log(`User ${userId} did NOT find COMPLETED order for event ${id}.`);
          }
        } catch (orderError) {
          console.error(`Error checking 'orders' for user ${userId}, event ${id}:`, orderError);
        }

        try {
          const like = await eventLikesCollection.findOne({
            eventId: eventObjectId,
            userId: userObjectId,
          });
          if (like) {
            isLikedByCurrentUser = true;
            console.log(`User ${userId} has liked event ${id}.`);
          }
        } catch (likeError) {
          console.error(`Error checking 'eventLikes' for user ${userId}, event ${id}:`, likeError);
        }
      }

      // 2. Fallback: If not registered via order + userId check, AND userEmail is available, check 'payments' collection
      if (!isRegistered && userEmail) { 
        const paymentsCollection = await getCollection("payments");
        try {
          console.log(`Checking 'payments' status (fallback) for email ${userEmail} and event ${id} because order check by userId did not confirm registration.`);
          const paymentRecord = await paymentsCollection.findOne({
            eventId: eventObjectId, 
            email: userEmail,
            status: "success" 
          });

          if (paymentRecord) {
            isRegistered = true;
            // Ensure orderId exists and is a valid ObjectId before trying to use it
            if (paymentRecord.orderId && ObjectId.isValid(paymentRecord.orderId)) { 
                userOrderId = paymentRecord.orderId.toString();
            }
          } else {
            console.log(`No successful payment found in 'payments' for email ${userEmail} and event ${id} via fallback. Registration status remains: ${isRegistered}.`);
          }
        } catch (paymentError) {
          console.error(`Error checking 'payments' (fallback) for email ${userEmail}, event ${id}:`, paymentError);
        }
      }

      // Transform event data (This was the old location of transformEvent call)
      // We now call transformEvent earlier to use its processed visibility.
      // The object is already mostly transformed by `transformedEventWithVisibility`.
      // We just need to add the dynamic properties.
      const finalTransformedEvent = {
        ...transformedEventWithVisibility,
        isRegistered,
        userOrderId,
        isLikedByCurrentUser,
        isOwner 
      } as Event & {  // Ensure the final type includes these ad-hoc properties
        isRegistered?: boolean; 
        userOrderId?: string | null; 
        isLikedByCurrentUser?: boolean;
        isOwner?: boolean;
      };
        
      console.log(`Transformed event data (first 200 chars):`,
        JSON.stringify(finalTransformedEvent, null, 2).substring(0, 200) + '...');
      
      // Add to cache
      // if (!skipCache) {
      //   queryCache.set(cacheKey, { data: finalTransformedEvent, timestamp: Date.now() });
      //   console.log(`Cached event ${id} (User: ${userId || userEmail || 'anon'}, inclLike: ${!!userId})`);
      // }
      
      return finalTransformedEvent;
    } catch (error) {
      console.error(`Error finding event with ID ${id}:`, error);
      throw error;
    }
  },

  // Clear cache for specific event or entire cache
  clearCache(eventId?: string) {
    // console.log("[Cache] Clearing cache..."); // Commented out as queryCache is removed
    // if (queryCache) { // queryCache is removed
    //   if (eventId) {
    //     const keysToDelete = [];
    //     for (const key of queryCache.keys()) {
    //       if (key.includes(`event:${eventId}`) || key.includes(`related:${eventId}`)) {
    //         keysToDelete.push(key);
    //       }
    //     }
    //     keysToDelete.forEach(key => queryCache.delete(key));
    //     console.log(`[Cache] Cleared keys related to eventId: ${eventId}`);
    //   } else {
    //     queryCache.clear();
    //     console.log("[Cache] Cleared all query cache.");
    //   }
    // }
  },

  async createEvent(data: CreateEventInput) {
    const db = await getDbConnection();
    const eventsCollection = db.collection("events");

    // Prepare data for insertion, explicitly handling organizerId type
    const { organizerId, ...restOfData } = data;
    
    const eventDataForDb = {
      ...restOfData,
      organizerId: ObjectId.isValid(organizerId) ? new ObjectId(organizerId) : organizerId, // Convert or keep original if invalid (schema should catch later)
      date: typeof data.date === 'string' ? new Date(data.date) : data.date,
      endDate: data.endDate ? (typeof data.endDate === 'string' ? new Date(data.endDate) : data.endDate) : undefined,
      registrationDeadline: data.registrationDeadline ? 
        (typeof data.registrationDeadline === 'string' ? new Date(data.registrationDeadline) : data.registrationDeadline) : undefined,
      earlyBirdDeadline: data.earlyBirdDeadline ? 
        (typeof data.earlyBirdDeadline === 'string' ? new Date(data.earlyBirdDeadline) : data.earlyBirdDeadline) : undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
      attendees: 0, // Default attendees to 0 for new event
      // Initialize engagement counts
      viewCount: 0,
      likeCount: 0,
      shareCount: 0,
      // Ensure visibility is included as per CreateEventInput, which should be EventVisibilityType
      visibility: data.visibility 
    };

    // Validate organizerId before insertion (optional, if not relying solely on schema)
    if (!ObjectId.isValid(organizerId)) {
      // Consider throwing an error here if an invalid string organizerId is not acceptable
      // For now, it would insert the invalid string, which might be caught by DB schema or later logic
      console.warn(`[createEvent] Attempting to create event with invalid organizerId string: ${organizerId}`);
    } else {
       eventDataForDb.organizerId = new ObjectId(organizerId); // Ensure it's ObjectId if valid
    }
    
    const result = await eventsCollection.insertOne(eventDataForDb);

    // Fetch the newly created event
    const createdEvent = await eventsCollection.findOne({ _id: result.insertedId });
    
    if (!createdEvent) {
      throw new Error("Failed to retrieve created event");
    }
    
    // Clear any relevant caches
    this.clearCache();
    
    // Transform and return the event
    return transformEvent(createdEvent);
  },

  async updateEvent(id: string, data: UpdateEventInput) {
    if (!ObjectId.isValid(id)) {
      throw new Error("Invalid event ID");
    }

    const db = await getDbConnection();
    const eventsCollection = db.collection("events");
    const result = await eventsCollection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          ...data,
          updatedAt: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      throw new Error("Event not found");
    }
    
    // Clear cache for this specific event
    this.clearCache(id);
    // ALSO clear the general list cache to ensure list views update
    this.clearCache(); 

    return result.modifiedCount > 0;
  },

  async deleteEvent(id: string) {
    if (!ObjectId.isValid(id)) {
      throw new Error("Invalid event ID");
    }

    const db = await getDbConnection();
    const eventsCollection = db.collection("events");
    const result = await eventsCollection.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      throw new Error("Event not found");
    }
    
    // Clear cache for this specific event and any list queries
    this.clearCache(id);
    this.clearCache(); // Also clear list caches since counts will change

    return true;
  },

  async getRelatedEvents(eventId: string, limit = 3, projection?: Record<string, 1 | 0>, skipCache = false) {
    if (!ObjectId.isValid(eventId)) {
      throw new Error("Invalid base event ID for related events.");
    }
    
    // Generate cache key
    // const cacheKey = `related:${eventId}:${limit}:${JSON.stringify(projection || {})}`;
    
    // Check cache first
    // const cached = queryCache.get(cacheKey);
    // if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    //   return cached.data;
    // }
    
    const db = await getDbConnection();
    const baseEvent = await db.collection("events").findOne({ _id: new ObjectId(eventId) });
    if (!baseEvent) return [];
    
    const query: any = {
      _id: { $ne: new ObjectId(eventId) }, // Exclude the base event itself
      // Add more sophisticated relation logic if needed (e.g., based on tags, category, location)
    };
    if (baseEvent.category) query.category = baseEvent.category;
    else if (baseEvent.tags && baseEvent.tags.length > 0) query.tags = { $in: baseEvent.tags };
    
    // Ensure related events are visible (publicly accessible)
    // This now correctly checks for either the string 'public' or an object with status 'public'
    query.$or = [
      { visibility: 'public' }, 
      { "visibility.status": 'public' } 
    ];

    const relatedEvents = await db.collection("events").find(query).project(projection).limit(limit).toArray();
    const transformedEvents = relatedEvents.map(event => transformEvent(event));
    // if (!skipCache && queryCache) { queryCache.set(cacheKey, { data: transformedEvents, timestamp: Date.now() }); }
    return transformedEvents;
  },

  async getEventsByOrganizer(organizerId: string, limit = 3, projection?: Record<string, 1 | 0>) {
    if (!ObjectId.isValid(organizerId)) {
      throw new Error("Invalid organizer ID");
    }
    
    // Generate cache key
    // const cacheKey = `organizer:${organizerId}:${limit}:${JSON.stringify(projection || {})}`;
    
    // Check cache first
    // const cached = queryCache.get(cacheKey);
    // if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    //   console.log(`Cache hit for organizer events: ${organizerId}`);
    //   return cached.data;
    // }

    const db = await getDbConnection();
    const events = await db.collection("events")
      .find({ organizerId: new ObjectId(organizerId) })
      .project(projection || {})
      .sort({ date: 1 })
      .limit(limit)
      .toArray();
    
    // Cache the result
    // if (!skipCache && queryCache) { queryCache.set(cacheKey, { data: events, timestamp: Date.now() }); }

    return events;
  },

  async getEventsByStatus(organizerId: string, status: string, limit = 10, skipCache = false) {
    if (!ObjectId.isValid(organizerId)) {
      throw new Error("Invalid organizer ID");
    }
    
    // Generate cache key
    // const cacheKey = `organizer:${organizerId}:status:${status}:${limit}`;
    
    // Check cache first
    // const cached = queryCache.get(cacheKey);
    // if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    //   console.log(`Cache hit for organizer status events: ${organizerId}:${status}`);
    //   return cached.data;
    // }

    const db = await getDbConnection();
    
    // Case-insensitive status matching
    const events = await db.collection("events")
      .find({ 
        organizerId: new ObjectId(organizerId),
        status: { $regex: new RegExp(status, 'i') }
      })
      .sort({ date: 1 })
      .limit(limit)
      .toArray();
    
    // Cache the result
    // if (!skipCache && queryCache) { queryCache.set(cacheKey, { data: events, timestamp: Date.now() }); }

    return events;
  },

  // --- Engagement Count Methods ---
  async incrementViewCount(eventId: string) {
    if (!ObjectId.isValid(eventId)) throw new Error("Invalid event ID for view count increment");
    const db = await getDbConnection();
    const result = await db.collection("events").updateOne(
      { _id: new ObjectId(eventId) },
      { $inc: { viewCount: 1 } }
    );
    this.clearCache(eventId); // Clear cache for this event
    return result.modifiedCount > 0;
  },

  async likeEvent(eventId: string, userId: string): Promise<boolean> {
    if (!ObjectId.isValid(eventId) || !ObjectId.isValid(userId)) {
      console.error("Invalid event ID or user ID for likeEvent");
      throw new Error("Invalid event ID or user ID for likeEvent");
    }
    const db: Db = await getDbConnection();
    const eventLikesCollection = db.collection<EventLikeDocument>('eventLikes');
    const eventObjectId = new ObjectId(eventId);
    const userObjectId = new ObjectId(userId);

    try {
      // Check if already liked
      const existingLike = await eventLikesCollection.findOne({
        eventId: eventObjectId,
        userId: userObjectId,
      });
      if (existingLike) {
        console.log(`User ${userId} already liked event ${eventId}.`);
        return false; // Indicate already liked, no change
      }

      // Create like document
      await eventLikesCollection.insertOne({
        _id: new ObjectId(), // Generate new ObjectId for the like document itself
        eventId: eventObjectId,
        userId: userObjectId,
        createdAt: new Date(),
      } as EventLikeDocument); // Cast to satisfy TS if structure matches but type inference is off

      // Increment likeCount on event
      const updateResult = await db.collection("events").updateOne(
        { _id: eventObjectId },
        { $inc: { likeCount: 1 } }
      );
      
      this.clearCache(eventId); // Clear cache for this event
      return updateResult.modifiedCount > 0; // True if event likeCount was incremented
    } catch (error: any) {
      // Handle potential unique index violation if two requests try to insert simultaneously,
      // though the findOne check should prevent most cases.
      if (error.code === 11000) { // MongoDB duplicate key error code
        console.warn(`Attempt to re-like event ${eventId} by user ${userId} failed due to timing (already liked).`);
        return false; // Already liked
      }
      console.error(`Error liking event ${eventId} for user ${userId}:`, error);
      throw error; // Re-throw other errors
    }
  },

  async unlikeEvent(eventId: string, userId: string): Promise<boolean> {
    if (!ObjectId.isValid(eventId) || !ObjectId.isValid(userId)) {
      console.error("Invalid event ID or user ID for unlikeEvent");
      throw new Error("Invalid event ID or user ID for unlikeEvent");
    }
    const db: Db = await getDbConnection();
    const eventLikesCollection = db.collection<EventLikeDocument>('eventLikes');
    const eventObjectId = new ObjectId(eventId);
    const userObjectId = new ObjectId(userId);

    const deleteResult = await eventLikesCollection.deleteOne({
      eventId: eventObjectId,
      userId: userObjectId,
    });

    if (deleteResult.deletedCount > 0) {
      // If a like was actually deleted, decrement the count on the event
      await db.collection("events").updateOne(
        { _id: eventObjectId, likeCount: { $gt: 0 } }, // Ensure not decrementing below 0
        { $inc: { likeCount: -1 } }
      );
      this.clearCache(eventId);
      return true; // Successfully unliked
    }
    return false; // No like found to delete, or no change made
  },

  async incrementShareCount(eventId: string) {
    if (!ObjectId.isValid(eventId)) throw new Error("Invalid event ID for share count increment");
    const db = await getDbConnection();
    const result = await db.collection("events").updateOne(
      { _id: new ObjectId(eventId) },
      { $inc: { shareCount: 1 } }
    );
    this.clearCache(eventId);
    return result.modifiedCount > 0;
  },
  // --- End Engagement Count Methods ---

  async countEventsByOrganizer(organizerId: string): Promise<number> {
    if (!ObjectId.isValid(organizerId)) {
      // Or handle as per your error strategy, e.g., return 0 or throw
      console.error("Invalid organizer ID for countEventsByOrganizer:", organizerId);
      return 0; 
    }
    try {
      const db = await getDbConnection();
      const count = await db.collection("events").countDocuments({ organizerId: new ObjectId(organizerId) });
      return count;
    } catch (error) {
      console.error(`Error counting events for organizer ${organizerId}:`, error);
      // Depending on desired behavior, re-throw or return a value indicating error (e.g., -1 or 0)
      throw error; 
    }
  },
}; 