// hooks/useEvents.ts
'use client';

import { useState, useEffect } from 'react';
import { Event, EventVisibilityType } from '@/types/event';
import { createJaaSMeetingUrl } from '@/utils/jitsi';

interface EventFormData extends FormData {
  get(key: string): string | null;
}

const STORAGE_KEY = 'organizer_events';

export const useEvents = () => {
  const [events, setEvents] = useState<Event[]>(() => {
    if (typeof window !== 'undefined') {
      const savedEvents = localStorage.getItem(STORAGE_KEY);
      return savedEvents ? JSON.parse(savedEvents) : [];
    }
    return [];
  });

  // Persist events to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
    }
  }, [events]);

  const createEvent = (formData: EventFormData) => {
    const isVirtual = formData.get('eventType') === 'virtual';
    const JITSI_APP_ID = process.env.NEXT_PUBLIC_JITSI_APP_ID || 'YOUR_JITSI_APP_ID_FALLBACK'; // Ensure a fallback or proper handling if env var is missing
    const roomNameForNewEvent = Date.now().toString(36) + Math.random().toString(36).substring(2); // A more unique room name
    let meetingLink = isVirtual ? createJaaSMeetingUrl(JITSI_APP_ID, roomNameForNewEvent) : undefined;

    const newEvent: Event = {
      _id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${Math.random().toString(36).substr(2, 9)}`, // More unique ID with additional entropy
      title: formData.get('title') || '',
      description: formData.get('description') || '',
      date: formData.get('date') || new Date().toISOString(),
      location: !isVirtual ? { address: formData.get('location') || '' } : undefined,
      meetingLink,
      attendees: 0,
      maxAttendees: parseInt(formData.get('maxAttendees') || '0'),
      price: parseFloat(formData.get('price') || '0'),
      currency: 'USD',
      image: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&q=80',
      organizerId: '1', // In production, this would come from auth
      organizer: {
        id: '1',
        name: 'Demo Organizer',
        email: 'demo@example.com',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=demo'
      },
      isVirtual,
      status: 'upcoming',
      visibility: 'public',
      category: formData.get('category') as Event['category'] || 'other',
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: '1',
        lastModifiedBy: '1'
      }
    };

    setEvents(prev => [...prev, newEvent]);
    return newEvent;
  };

  const updateEvent = (id: string, updatedEvent: Partial<Event>) => {
    setEvents(prev => prev.map(event => {
      if (event._id === id) {
        return { ...event, ...updatedEvent };
      }
      return event;
    }));
  };

  const deleteEvent = (id: string) => {
    setEvents(prev => prev.filter(event => event._id !== id));
  };

  const updateEventVisibility = (id: string, visibility: EventVisibilityType) => {
    setEvents(prev => prev.map(event => {
      if (event._id === id) {
        return {
          ...event,
          visibility,
          metadata: {
            ...event.metadata,
            updatedAt: new Date().toISOString()
          }
        };
      }
      return event;
    }));

    return events.find(event => event._id === id);
  };

  // Additional utility functions
  const getEventById = (id: string) => {
    return events.find(event => event._id === id);
  };

  const updateEventStatus = (id: string, status: Event['status']) => {
    setEvents(prev => prev.map(event => {
      if (event._id === id) {
        return {
          ...event,
          status,
          metadata: {
            ...event.metadata,
            updatedAt: new Date().toISOString()
          }
        };
      }
      return event;
    }));

    return events.find(event => event._id === id);
  };

  const updateEventAttendees = (id: string, attendeeCount: number) => {
    setEvents(prev => prev.map(event => {
      if (event._id === id) {
        return {
          ...event,
          attendees: attendeeCount,
          metadata: {
            ...event.metadata,
            updatedAt: new Date().toISOString()
          }
        };
      }
      return event;
    }));

    return events.find(event => event._id === id);
  };

  return {
    events,
    createEvent,
    updateEvent,
    deleteEvent,
    updateEventVisibility,
    getEventById,
    updateEventStatus,
    updateEventAttendees
  };
};

// hooks/useEventManagement.ts remains the same as in the previous response, 
// but now it will work with the updated useEvents hook