import { useState, useCallback, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { Event, UpdateEventInput } from '@/types/event';
import { getCsrfToken } from 'next-auth/react';

/**
 * Custom hook for managing events
 * - Loads events from API with proper error handling and retries
 * - Provides functions for event operations (create, update, delete)
 * - Handles loading states
 */
export function useEventManagement() {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  
  // Request tracking for throttling and avoiding duplicate calls
  const requestCount = useRef(0);
  const lastRequestTime = useRef<number>(0);
  const MIN_REQUEST_INTERVAL = 1000; // Minimum time between requests in ms
  
  /**
   * Load events from the API with proper error handling and retries
   */
  const loadEvents = useCallback(async () => {
    // Throttle requests to prevent rapid API calls
    const now = Date.now();
    if (now - lastRequestTime.current < MIN_REQUEST_INTERVAL) {
      return events; // Return current events if throttled
    }
    
    // Skip if already loading
    if (isLoadingEvents) {
      return events;
    }
    
    // Track this request
    requestCount.current += 1;
    lastRequestTime.current = now;
    
    let controller: AbortController | null = new AbortController();
    let timeoutId: NodeJS.Timeout | null = null;
    
    try {
      setIsLoadingEvents(true);
      
      // Set timeout to cancel hanging requests
      timeoutId = setTimeout(() => {
        if (controller) {
          controller.abort('Request timeout reached');
        }
      }, 30000);
      
      // Create URL with cache-busting and new viewMode parameter
      const timestamp = Date.now();
      // Append viewMode=organizerOwned for this specific hook usage
      const url = `/api/events?_t=${timestamp}&forceRefresh=true&viewMode=organizerOwned`;
      
      // Define retry logic
      const MAX_RETRIES = 2;
      let retryCount = 0;
      let response = null;
      
      // Implement retry loop
      while (retryCount <= MAX_RETRIES && !response) {
        if (retryCount > 0) {
          // Create new controller for retry
          controller = new AbortController();
          // Add exponential backoff delay
          const delay = Math.min(1000 * Math.pow(2, retryCount), 8000);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        try {
          response = await fetch(url, {
            cache: 'no-store',
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
              'Expires': '0',
            },
            signal: controller?.signal
          });
        } catch (error) {
          // Only throw if we've exhausted retries
          if (retryCount >= MAX_RETRIES) {
            throw error;
          }
        }
        
        retryCount++;
      }
      
      // Clear timeout once response is received
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      
      if (!response) {
        throw new Error('Network error occurred while fetching events after retries');
      }
      
      if (!response.ok) {
        throw new Error(`Failed to load events: ${response.status} ${response.statusText}`);
      }
      
      // Parse response data
      let data;
      try {
        data = await response.json();
        
        // Ensure data.events exists
        if (!data.events) {
          data.events = [];
        }
      } catch (err) {
        throw new Error('Error parsing API response');
      }
      
      // Filter valid events
      const validEvents = data.events.filter((event: any) => 
          event && 
          typeof event === 'object' && 
          event._id && 
          event.title && 
          event.date
        );
        
      // Update state with valid events
      setEvents(validEvents);
      return validEvents;
      
    } catch (error) {
      // Handle errors gracefully
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to load events';
      
      console.error('Error loading events:', errorMessage);
      toast.error(errorMessage);
      return [];
    } finally {
      // Always clean up
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      setIsLoadingEvents(false);
    }
  }, [events, isLoadingEvents]);

  /**
   * Create a new event
   */
  const createEvent = useCallback(async (formData: FormData) => {
    try {
      const response = await fetch('/api/events/create', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create event: ${response.status} - ${errorText}`);
      }
      
      const data = await response.json();
      
      // Add new event to state
      setEvents(prevEvents => [data.event, ...prevEvents]);
      return data.event;
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to create event';
      
      console.error('Error creating event:', errorMessage);
      toast.error(errorMessage);
      throw error;
    }
  }, []);

  /**
   * Update an existing event
   */
  const updateEvent = useCallback(async (eventId: string, updateData: UpdateEventInput) => {
    try {
      console.log('Updating event:', eventId, 'with data:', updateData); // Log data being sent
      
      const csrfToken = await getCsrfToken();
      console.log("[updateEvent] Retrieved CSRF Token:", csrfToken);
      if (!csrfToken) {
        throw new Error('Could not retrieve CSRF token. Ensure you are logged in.');
      }

      // Restore body and Content-Type
      const response = await fetch(`/api/events/${eventId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken
        },
        body: JSON.stringify(updateData)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to update event: ${response.status} - ${errorText}`);
      }
      
      const data = await response.json();
      
      // Ensure the updated event returned from API also has the object structure in FE state
      let updatedEvent = data.event;
      if (!updatedEvent) { 
        // Handle case where API might not return the event data on update
        console.warn("Update API did not return event data. Refetching may be needed.");
        throw new Error("Update response did not contain event data.");
      }
      
      if (updatedEvent.visibility && typeof updatedEvent.visibility === 'string') {
          console.log(`Normalizing updated event visibility (string -> object) for ID: ${eventId}`);
          updatedEvent = { ...updatedEvent, visibility: { status: updatedEvent.visibility } };
      } else if (!updatedEvent.visibility || typeof updatedEvent.visibility !== 'object' || !updatedEvent.visibility.status) {
          console.log(`Normalizing updated event visibility (missing/invalid -> object) for ID: ${eventId}`);
          // Ensure it's at least the default object structure
          updatedEvent = { ...updatedEvent, visibility: { status: 'public' } };
      }

      // Update event in state using the normalized event
      setEvents(prevEvents => 
        prevEvents.map(e => 
          e._id === eventId ? updatedEvent : e // Use the potentially normalized event
        )
      );
      
      // --- Force reload of events after successful update --- 
      await loadEvents();
      console.log('Event list reloaded after update.');
      // --- End force reload ---

      return updatedEvent; // Return the normalized event
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to update event';
      
      console.error('Error updating event:', errorMessage);
      toast.error(errorMessage);
      throw error;
    }
  }, [loadEvents]);

  /**
   * Delete an event
   */
  const deleteEvent = useCallback(async (eventId: string) => {
    try {
      const csrfToken = await getCsrfToken();
      if (!csrfToken) {
        // It might be better to toast an error here or handle it more gracefully
        // if CSRF is critical for your DELETE operations.
        console.error('Could not retrieve CSRF token for delete operation.');
        throw new Error('CSRF token missing. Please try again.');
      }

      const response = await fetch(`/api/events/${eventId}`, { // Corrected URL
        method: 'DELETE', // Corrected method
        credentials: 'include',
        headers: {
          // 'Content-Type': 'application/json', // Not needed for DELETE with no body
          'X-CSRF-Token': csrfToken // Keep CSRF token if your backend expects it for DELETE
        },
        // body: JSON.stringify({ id: eventId }) // DELETE requests typically don't have a body
      });
      
      if (!response.ok) {
        let errorDetails = '';
        try {
          // Try to parse the error response as JSON, as our API sends structured errors
          const errorData = await response.json(); 
          errorDetails = errorData.error || JSON.stringify(errorData); 
        } catch (e) {
          // Fallback to text if JSON parsing fails
          errorDetails = await response.text();
        }
        // Construct a more informative error message
        throw new Error(`Failed to delete event: ${response.status} - ${errorDetails}`);
      }
      
      // Remove event from state locally instead of full reload
      setEvents(prevEvents => prevEvents.filter(e => e._id !== eventId));
      console.log(`[deleteEvent] Event ${eventId} removed from local state.`);

    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to delete event';
      
      console.error('Error deleting event:', errorMessage);
      toast.error(errorMessage);
      throw error; // Re-throw error so calling component knows it failed
    }
  }, []);

  /**
   * Cancel an event
   */
  const cancelEvent = useCallback(async (eventId: string) => {
    try {
      const response = await fetch(`/api/events/${eventId}/cancel`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to cancel event: ${response.status} - ${errorText}`);
      }
      
      const data = await response.json();
      
      // Update event in state
      setEvents(prevEvents => 
        prevEvents.map(event => 
          event._id === eventId ? { ...event, status: 'cancelled' } : event
        )
      );
      
      return data.event;
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to cancel event';
      
      console.error('Error cancelling event:', errorMessage);
      toast.error(errorMessage);
      throw error;
    }
  }, []);

  /**
   * Fetch details for a single event directly
   */
  const getEventDetails = useCallback(async (eventId: string): Promise<Event | null> => {
    if (!eventId) return null; 

    try {
      const response = await fetch(`/api/events/${eventId}?_t=${Date.now()}`);
      if (!response.ok) {
        console.error(`Failed to fetch event details for ${eventId}: ${response.status}`);
        return null; 
      }
      const data = await response.json();
      
      let fetchedEvent = data.event;
      if (!fetchedEvent) return null;

      // Normalize visibility
      if (fetchedEvent.visibility && typeof fetchedEvent.visibility === 'string') {
          fetchedEvent = { ...fetchedEvent, visibility: { status: fetchedEvent.visibility } };
      } else if (!fetchedEvent.visibility || typeof fetchedEvent.visibility !== 'object' || !fetchedEvent.visibility.status) {
          fetchedEvent = { ...fetchedEvent, visibility: { status: 'public' } };
      }

      return fetchedEvent as Event;

    } catch (error) {
      console.error(`Error fetching event details for ${eventId}:`, error);
      toast.error("Failed to load latest event details.");
      return null; 
    }
  }, []); 

  return {
    events,
    isLoadingEvents,
    loadEvents,
    createEvent,
    updateEvent,
    deleteEvent,
    cancelEvent,
    getEventDetails
  };
} 