import { useState, useCallback } from 'react';
import { VisibilityStatus } from '../types';
import { EventVisibilityType, UpdateVisibilityInput, EventVisibilityObject } from '@/types/event';

// Helper type for casting, assuming PrivateVisibility is { status: 'private', restrictedTo?: string[] }
// This aligns with EventVisibilityObject definition from @/types/event
type PrivateEventVisibility = Extract<EventVisibilityObject, { status: 'private' }>;

export const useVisibilitySettings = (initialVisibility?: EventVisibilityType) => {
  const [visibility, setVisibility] = useState<VisibilityStatus>(() => {
    if (!initialVisibility) return 'public';
    
    if (typeof initialVisibility === 'string') {
      return initialVisibility.toLowerCase() === 'private' ? 'private' : 'public';
    }
    // If object, use its status, default to public
    return initialVisibility.status?.toLowerCase() === 'private' ? 'private' : 'public';
  });

  // Removed scheduledFor and scheduledUntil states as 'scheduled' visibility status is deprecated.
  // If these dates are needed for UI, they should be managed by the main form state (eventData).

  const [restrictedTo, setRestrictedTo] = useState<string[]>(() => {
    if (initialVisibility && typeof initialVisibility === 'object' && initialVisibility.status === 'private') {
      // Safely access restrictedTo if it exists on the private visibility object
      const privateVis = initialVisibility as PrivateEventVisibility;
      return Array.isArray(privateVis.restrictedTo) ? privateVis.restrictedTo : [];
        }
    return [];
  });

  const createVisibilityObject = useCallback((): EventVisibilityObject => {
    if (visibility === 'private') {
      return { status: 'private', restrictedTo };
    }
    return { status: 'public' };
  }, [visibility, restrictedTo]);

  const addRestrictedUser = useCallback((user: string) => {
    setRestrictedTo(prev => {
      if (prev.includes(user)) return prev;
      return [...prev, user];
    });
  }, []);

  const removeRestrictedUser = useCallback((user: string) => {
    setRestrictedTo(prev => prev.filter(u => u !== user));
  }, []);

  return {
    visibility,
    setVisibility,
    // scheduledFor, // Removed
    // setScheduledFor, // Removed
    // scheduledUntil, // Removed
    // setScheduledUntil, // Removed
    restrictedTo,
    setRestrictedTo,
    addRestrictedUser,
    removeRestrictedUser,
    createVisibilityObject
  };
};

// Removed type PrivateVisibility = Extract<EventVisibilityObject, { status: 'private' }>; helper
// as PrivateEventVisibility is defined above for clarity. 