export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Event } from '@/types/event';
import mongoose from 'mongoose';
import { ObjectId } from 'mongodb';

/**
 * ✅ GET: Fetch Events with Filtering and Pagination
 * 
 * This endpoint handles fetching events with various filtering options,
 * pagination, and sorting.
 */
export async function GET(request: NextRequest) {
  const requestStartTime = Date.now();
  const currentTime = new Date();
  
  try {
    const { searchParams } = new URL(request.url);
    
    // --- Parameter Parsing --- 
    const page = parseInt(searchParams.get('page') || '1', 10);
    const perPage = parseInt(searchParams.get('perPage') || '12', 10);
    const sortBy = searchParams.get('sortBy') || 'date';
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 1 : -1; // 1 for asc, -1 for desc
    const searchQuery = searchParams.get('search');
    const hideExpiredParam = searchParams.get('hideExpired') === 'true';

    // --- New Filter Parameters (expect comma-separated values) ---
    const categoriesParam = searchParams.get('categories')?.split(',').filter(c => c.trim()) || [];
    const locationsParam = searchParams.get('locations')?.split(',').filter(l => l.trim()) || [];
    const priceRangesParam = searchParams.get('priceRanges')?.split(',').filter(p => p.trim()) || [];
    const datesParam = searchParams.get('dates')?.split(',').filter(d => d.trim()) || [];

    // Basic validation for pagination
    const validatedPage = Math.max(1, page);
    const validatedPerPage = Math.max(1, Math.min(100, perPage)); // Limit perPage
    const skip = (validatedPage - 1) * validatedPerPage;

    // Allowed sort fields
    const allowedSortFields = ['date', 'price', 'attendees', 'createdAt'];
    const validatedSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'date';
    let sortOptions: { [key: string]: 1 | -1 } = { [validatedSortBy]: sortOrder }; // Use let instead of const
    // Special case for attendees: use the 'attendees' virtual field if available or calculate
    if (validatedSortBy === 'attendees') {
       // If your model has a direct 'attendees' count field, use it
       // sortOptions = { attendees: sortOrder }; 
       // Otherwise, you might need aggregation later if it's calculated
       console.warn("[Events API] Sorting by calculated 'attendees' might require aggregation and is not fully implemented here.");
       // Default back to date sort if attendees sort is complex
       sortOptions = { date: sortOrder };
    }
    if (validatedSortBy === 'created') {
        sortOptions = { createdAt: sortOrder }; // Use createdAt field
    }

    // Handle cache clearing request
    const clearCache = searchParams.get('clearCache') === 'true';
    const forceRefresh = searchParams.get('forceRefresh') === 'true';
    const timestamp = searchParams.get('_t') || Date.now().toString();
    
    console.log(`[Events API] Request params: clearCache=${clearCache}, forceRefresh=${forceRefresh}, timestamp=${timestamp}`);
    
    // Always clear cache if requested (track the timestamp of last clear request)
    if (clearCache) {
      console.log('[Events API] Cache clear request received');
      try {
        const db = await connectDB();
        const eventService = require('@/lib/services/eventService').eventService;
        
        // Clear any cache the service might be using
        if (typeof eventService.clearCache === 'function') {
          await eventService.clearCache();
          console.log('Event service cache cleared');
        }
        
        return NextResponse.json({ 
          success: true, 
          message: 'Cache cleared successfully',
          timestamp: Date.now()
        }, {
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        });
      } catch (error) {
        console.error('Error clearing cache:', error);
        return NextResponse.json({ success: false, error: 'Error clearing cache' }, { status: 500 });
      }
    }
    
    // Get fresh data from database
    console.log('[Events API] Fetching fresh data from database');
    
    // Debug log to show MongoDB connection status
    if (mongoose.connection.readyState === 1) {
      console.log('[Events API] MongoDB connection is already established');
    } else {
      console.log(`[Events API] MongoDB connection status: ${mongoose.connection.readyState}. Connecting...`);
    }
    
    // Get current session (for filtering events by visibility)
    const session = await getServerSession(authOptions);
    const authenticatedUser = session?.user; // Use inferred type from next-auth.d.ts
    const authenticatedUserId = authenticatedUser?.id; // Use .id instead of ._id
    const userEmail = authenticatedUser?.email || ''; // Use empty string if no email
    console.log(`[Events GET] Session retrieved. UserID: ${authenticatedUserId || 'undefined'}, Email: ${userEmail || 'undefined'}`);
    
    // NEW: Read viewMode parameter
    const viewMode = searchParams.get('viewMode');

    // Connect to database
    const db = await connectDB();
    
    // --- Build MongoDB Filter --- 
    const filter: any = { $and: [] };

    if (viewMode === 'organizerOwned' && authenticatedUserId && ObjectId.isValid(authenticatedUserId)) {
        console.log(`[Events GET] Organizer Owned View: Filtering for organizerId: ${authenticatedUserId}`);
        filter.$and.push({ organizerId: new ObjectId(authenticatedUserId) });
        // In this mode, we don't need the broader coreVisibilityOrConditions, 
        // as ownership is the sole determinant for this view.
    } else {
        // 1. Core Visibility Logic (for general event listings)
        const coreVisibilityOrConditions: any[] = [];

        // ALWAYS allow public events
        coreVisibilityOrConditions.push({ visibility: 'public' });
        coreVisibilityOrConditions.push({ 'visibility.status': 'public' });

        // Add user-specific conditions ONLY if authenticated
        if (authenticatedUserId && ObjectId.isValid(authenticatedUserId)) {
            console.log(`[Events GET] User is authenticated (${authenticatedUserId}). Adding private/owner filters.`);
            // Allow own events (identified by organizerId matching the session _id)
            try {
                coreVisibilityOrConditions.push({ organizerId: new ObjectId(authenticatedUserId) }); 
            } catch (e) {
                console.error(`[Events GET] Failed to create ObjectId from authenticatedUserId: ${authenticatedUserId}`, e);
            }
            // Allow private events where user email is in restrictedTo list
            if (userEmail) { // Only add if email exists
                 coreVisibilityOrConditions.push({ 'visibility.status': 'private', 'visibility.restrictedTo': userEmail });
            }
        } else {
            console.log(`[Events GET] User not authenticated or invalid ID. Filtering for public only.`);
            // For unauthenticated users, the filter implicitly only includes the public conditions added above.
        }
        
        // The main filter part related to core visibility
        const coreVisibilityFilter = { $or: coreVisibilityOrConditions };

        // 2. Combine Core Visibility with Scheduled Logic - SIMPLIFIED: Only use core visibility
        // const finalVisibilityOrConditions = [
        //     // Condition A: Event matches core visibility and is NOT scheduled
        //     {
        //         ...coreVisibilityFilter,
        //         'visibility.status': { $ne: 'scheduled' },
        //         visibility: { $ne: 'scheduled' } // Handle old string format too
        //     },
        //     // Condition B: Event IS scheduled (access checked later in filterVisibleEvents)
        //     {
        //          'visibility.status': 'scheduled'
        //     }
        // ];
        // filter.$and.push({ $or: finalVisibilityOrConditions });

        // SIMPLIFIED: Just push the core visibility filter directly
        filter.$and.push(coreVisibilityFilter);
    }

    // 3. Expiry Filter (Respect hideExpiredParam)
    if (hideExpiredParam) {
        filter.$and.push({ 
            $or: [
                { endDate: { $gte: currentTime } }, // Has end date in the future
                { endDate: null, date: { $gte: currentTime } } // No end date, start date in the future
            ]
        });
    }

    // 4. Search Filter
    if (searchQuery && searchQuery.trim().length > 0) {
        const regex = new RegExp(searchQuery.trim(), 'i'); // Case-insensitive regex
        filter.$and.push({
            $or: [
                { title: { $regex: regex } },
                { description: { $regex: regex } },
                { category: { $regex: regex } },
                { 'location.city': { $regex: regex } },
                { 'location.address': { $regex: regex } },
                { tags: { $regex: regex } } // Search tags array
            ]
        });
        console.log(`[Events API] Applying search filter for: "${searchQuery}"`);
    }

    // 5. New Field Filters (handle multiple values)
    if (categoriesParam.length > 0) {
        filter.$and.push({ category: { $in: categoriesParam } });
    }

    // Location filter needs special handling for 'online'
    const locationConditions: any[] = [];
    const otherLocations = locationsParam.filter(loc => loc !== 'online');
    if (otherLocations.length > 0) {
        // Assuming locations map directly to 'location.city' or similar
        // Adjust field name as per your schema if different (e.g., 'location.address')
        locationConditions.push({ 'location.city': { $in: otherLocations } });
    }
    if (locationsParam.includes('online')) {
        locationConditions.push({ isVirtual: true });
    }
    if (locationConditions.length > 0) {
        filter.$and.push({ $or: locationConditions });
    }

    // Price Range Filter
    if (priceRangesParam.length > 0) {
        const priceConditions: any[] = [];
        priceRangesParam.forEach(range => {
            switch(range) {
                case 'free':
                    priceConditions.push({ price: { $in: [0, null] } });
                    break;
                case 'paid':
                    priceConditions.push({ price: { $gt: 0 } });
                    break;
                case 'under-100':
                    priceConditions.push({ price: { $gt: 0, $lt: 100 } });
                    break;
                case '100-500':
                    priceConditions.push({ price: { $gte: 100, $lte: 500 } });
                    break;
                case 'over-500':
                    priceConditions.push({ price: { $gt: 500 } });
                    break;
            }
        });
        if (priceConditions.length > 0) {
            filter.$and.push({ $or: priceConditions });
        }
    }

    // Date Filter (interpret relative dates)
    if (datesParam.length > 0) {
        const dateConditions: any[] = [];
        const now = new Date();
        now.setHours(0, 0, 0, 0); // Start of today

        const tomorrow = new Date(now);
        tomorrow.setDate(now.getDate() + 1);

        const endOfTomorrow = new Date(now);
        endOfTomorrow.setDate(now.getDate() + 2);

        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1)); // Assuming Monday start

        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 7);

        const startOfNextWeek = new Date(endOfWeek);
        const endOfNextWeek = new Date(startOfNextWeek);
        endOfNextWeek.setDate(startOfNextWeek.getDate() + 7);

        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        endOfMonth.setHours(23, 59, 59, 999); // End of day for last day of month

        const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        const endOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 2, 0);
        endOfNextMonth.setHours(23, 59, 59, 999);

        // Simple Weekend Logic (Sat/Sun)
        const saturday = new Date(startOfWeek);
        saturday.setDate(startOfWeek.getDate() + 5);
        const mondayAfterWeekend = new Date(endOfWeek);

        datesParam.forEach(dateOpt => {
            let rangeStart: Date | null = null;
            let rangeEnd: Date | null = null; // Exclusive

            switch(dateOpt) {
                case 'today': rangeStart = now; rangeEnd = tomorrow; break;
                case 'tomorrow': rangeStart = tomorrow; rangeEnd = endOfTomorrow; break;
                case 'this-week': rangeStart = startOfWeek; rangeEnd = endOfWeek; break;
                case 'this-weekend': rangeStart = saturday; rangeEnd = mondayAfterWeekend; break;
                case 'next-week': rangeStart = startOfNextWeek; rangeEnd = endOfNextWeek; break;
                case 'next-month': rangeStart = startOfNextMonth; rangeEnd = endOfNextMonth; break;
            }

            if (rangeStart && rangeEnd) {
                // Filter events whose start date falls within the range
                // Adjust logic if you need to filter events *overlapping* the range
                dateConditions.push({ date: { $gte: rangeStart, $lt: rangeEnd } });
            }
        });

        if (dateConditions.length > 0) {
            filter.$and.push({ $or: dateConditions });
        }
    }
    
    // If $and is empty, remove it
    if (filter.$and.length === 0) {
        delete filter.$and;
    }

    console.log(`[Events GET] Constructed Final MongoDB filter:`, JSON.stringify(filter));
    
    // --- Execute Query --- 
    const totalFilteredCount = await db.collection('events').countDocuments(filter);
    const eventsFromDb = await db.collection('events')
      .find(filter)
      .sort(sortOptions)
      .skip(skip)
      .limit(validatedPerPage)
      .maxTimeMS(15000)
      .toArray();
      
    console.log(`[Events API] Database query returned ${eventsFromDb.length} documents matching filter (Page: ${validatedPage}, Limit: ${validatedPerPage}). Total matching: ${totalFilteredCount}`);
    
    // 7. Final Processing & Filtering (after fetching)
    // Assign directly from DB result - rely on DB query for visibility
    const finalEvents = eventsFromDb as unknown as Event[];

    const totalEvents = await db.collection('events').countDocuments(filter);

    // --- Response Construction --- 
    const responsePayload = {
      success: true,
      message: 'Events fetched successfully',
      pagination: {
        currentPage: validatedPage,
        totalPages: Math.ceil(totalEvents / validatedPerPage),
        totalItems: totalEvents,
        itemsPerPage: validatedPerPage,
      },
      events: finalEvents,
      _serverRequestTime: Date.now() - requestStartTime,
    };
    
    // console.log(`[Events API] Sending response: ${finalEvents.length} events, Total: ${totalEvents}, Page: ${validatedPage}`);

    return NextResponse.json(responsePayload, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error: any) {
    console.error('[Events API] Error fetching events:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch events', 
        details: error.message, 
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined 
      }, 
      { status: 500 }
    );
  }
}

// POST function remains unchanged
// PUT function remains unchanged
// DELETE function remains unchanged
