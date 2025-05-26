// hooks/useEventManagement.ts
'use client';

import { useState, useCallback, useRef } from 'react';
import { Event } from '@/types/event';
import { useRouter } from 'next/navigation';

// Check if an event is expired for more than 2 days
const isExpiredForMoreThanTwoDays = (event: Event): boolean => {
  if (!event.date) return false;
  
  try {
    const now = new Date();
    const eventDate = new Date(event.date);
    
    // If the event has an end date, use that for comparison
    if (event.endDate) {
      const endDate = new Date(event.endDate);
      
      // Check if expired for more than 2 days
      const twoDaysAfterEnd = new Date(endDate);
      twoDaysAfterEnd.setDate(twoDaysAfterEnd.getDate() + 2);
      
      return now > twoDaysAfterEnd;
    }
    
    // If it has a duration, calculate the end time
    if (event.duration && typeof event.duration === 'number') {
      const endTime = new Date(eventDate.getTime() + (event.duration * 60 * 1000));
      
      // Check if expired for more than 2 days
      const twoDaysAfterEnd = new Date(endTime);
      twoDaysAfterEnd.setDate(twoDaysAfterEnd.getDate() + 2);
      
      return now > twoDaysAfterEnd;
    }
    
    // Default to checking if the start date is in the past + 2 days
    const twoDaysAfterStart = new Date(eventDate);
    twoDaysAfterStart.setDate(twoDaysAfterStart.getDate() + 2);
    
    return now > twoDaysAfterStart;
  } catch (e) {
    return false;
  }
};

export const useEventManagement = () => {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const lastFetchTime = useRef<number>(0);
  const CACHE_DURATION = 10000; // 10 seconds cache

  const fetchEvents = useCallback(async () => {
    // Check if we've fetched recently to prevent redundant calls
    const now = Date.now();
    if (now - lastFetchTime.current < CACHE_DURATION && events.length > 0) {
      console.log('Using cached events data');
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch('/api/events');
      if (!response.ok) throw new Error('Failed to fetch events');
      const data = await response.json();
      
      // Extract events from the paginated response
      const eventsList = data.events || [];
      
      // Filter out events that have been expired for more than 2 days
      // unless they are completed or cancelled (those statuses take precedence)
      const filteredEvents = eventsList.filter(event => {
        if (event.status === 'completed' || event.status === 'cancelled') {
          return true; // Keep completed and cancelled events regardless of date
        }
        return !isExpiredForMoreThanTwoDays(event);
      });
      
      setEvents(filteredEvents);
      lastFetchTime.current = now;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load events');
      setEvents([]);
    } finally {
      setIsLoading(false);
    }
  }, [events.length]);

  const handleEdit = useCallback((id: string) => {
    router.push(`/organizer/edit/${id}`);
  }, [router]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/events/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${process.env.NEXT_PUBLIC_EVENT_API_SECRET}` }
      });
      if (response.ok) {
        setEvents(prev => prev.filter(event => event._id !== id));
      }
    } catch (error) {
      console.error('Failed to delete event:', error);
    }
  }, []);

  const handleCreateEvent = useCallback(async (formData: FormData) => {
    try {
      // Convert FormData to a proper event input object
      const data = Object.fromEntries(formData.entries());
      
      // Get the current user's session
      const sessionResponse = await fetch('/api/auth/session');
      if (!sessionResponse.ok) {
        throw new Error('Failed to get user session');
      }
      const session = await sessionResponse.json();
      if (!session?.user?.id) {
        throw new Error('User not authenticated');
      }

      // Transform date fields to proper format
      const eventInput = {
        ...data,
        organizerId: session.user.id, // Add organizerId from session
        organizer: {
          id: session.user.id,
          name: session.user.name || 'Unknown',
          email: session.user.email,
          avatar: session.user.image
        },
        // Ensure all dates are in ISO string format
        date: data.date ? new Date(data.date as string).toISOString() : new Date().toISOString(),
        endDate: data.endDate ? new Date(data.endDate as string).toISOString() : undefined,
        registrationDeadline: data.registrationDeadline ? new Date(data.registrationDeadline as string).toISOString() : undefined,
        earlyBirdDeadline: data.earlyBirdDeadline ? new Date(data.earlyBirdDeadline as string).toISOString() : undefined,
        // Parse numeric fields
        price: data.price ? parseFloat(data.price as string) : 0,
        maxAttendees: data.maxAttendees ? parseInt(data.maxAttendees as string, 10) : 100,
        minimumAttendees: data.minimumAttendees ? parseInt(data.minimumAttendees as string, 10) : 0,
        duration: data.duration ? parseInt(data.duration as string, 10) : 120,
        // Handle boolean fields
        isVirtual: data.isVirtual === "true",
        featured: data.featured === "true",
        promoted: data.promoted === "true",
        // Handle arrays
        tags: data.tags ? JSON.parse(data.tags as string) : [],
        requirements: data.requirements ? JSON.parse(data.requirements as string) : [],
        targetAudience: data.targetAudience ? JSON.parse(data.targetAudience as string) : [],
        // Handle visibility settings
        visibility: data.visibility ? JSON.parse(data.visibility as string) : {
          status: "public",
          isVisible: true
        }
      };

      // Use the dedicated endpoint for event creation
      const response = await fetch('/api/events/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventInput)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create event');
      }

      const { event } = await response.json();
      
      // Add the new event to the state
      if (event && event._id) {
        setEvents(prev => [...prev, event]);
      }
      
      return event;
    } catch (error) {
      console.error('Error creating event:', error);
      throw error;
    }
  }, []);

  return {
    events,
    isLoading,
    error,
    showForm,
    setShowForm,
    handleEdit,
    handleDelete,
    handleCreateEvent,
    fetchEvents
  };
};