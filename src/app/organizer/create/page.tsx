"use client"
import React, { useState, useEffect, useCallback, useRef, useMemo, Suspense } from "react";
import { PlusCircle, Loader,  RefreshCw, Loader2,  AlertCircle, Plus, ArrowUpCircle } from "lucide-react";
import dynamic from 'next/dynamic';
import { toast } from "react-hot-toast";
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';

import { useUser } from '@/app/components/auth/UserProvider';
import { Event, EventStatus, EventVisibilityType } from "@/types/event";

// Custom components
import EventList from "./components/EventList/EventList";
import EventGrid from "./components/EventList/EventGrid";
import EventCalendarView from "./components/EventList/EventCalendarView";

// Import components
import { LoadingScreen } from "./components/LoadingScreen";
import { ErrorScreen } from "./components/ErrorScreen";
import { LimitReachedScreen } from "./components/LimitReachedScreen";
import { SearchBar } from "./components/EventList/SearchBar";
import { ViewControls } from "./components/modals/ViewControls";
import { EventFormModal } from "./components/forms/EventFormModal";
import { DeleteConfirmationModal } from "./components/modals/DeleteConfirmationModal";
import { VisibilitySettingsModal } from "./components/modals/VisibilitySettingsModal";
import { ErrorBoundary } from "./utils/ErrorBoundary";

// Import custom hooks
import useSubscriptionCheck from "./hooks/useSubscriptionCheck";
import { useEventManagement } from "./hooks/useEventManagement";

// Debounce helper function
const debounce = <F extends (...args: any[]) => any>(func: F, wait: number) => {
  let timeout: NodeJS.Timeout | null = null;
  
  return (...args: Parameters<F>): void => {
    if (timeout) clearTimeout(timeout);
    
    timeout = setTimeout(() => {
      func(...args);
    }, wait);
  };
};

// Dynamically import EventForm to reduce initial load time
const EventForm = dynamic(
  () => import('./components/forms/EventForm'),
  {
    loading: () => (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-gray-800 rounded-xl w-full max-w-3xl p-8 flex items-center justify-center">
          <Loader className="w-8 h-8 text-purple-500 animate-spin" />
          <span className="ml-3 text-white">Loading form...</span>
        </div>
      </div>
    ),
    ssr: false
  }
);

// Define FilterStatus type here
type FilterStatus = 'all' | 'upcoming' | 'ongoing' | 'expired' | 'completed' | 'cancelled' | 'draft' | 'published';

// Main component content
function CreateEventPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession({
    required: false,
    onUnauthenticated() {
      router.push('/auth/signin');
    }
  });
  const { user, isLoading: isUserLoading, hasValidSubscription } = useUser();
  const sessionChecked = useRef(false);
  
  // Check for freshStart parameter when coming back to create another event
  const freshStart = searchParams.get('freshStart') === 'true';
  
  // Consolidated loading states
  const [appState, setAppState] = useState({
    isCheckingPermissions: true,
    isLoadingPermissions: true,
    hasReachedLimit: false,
    loadError: null as string | null,
    bypassLoading: false,
    isProcessingAction: false,
    currentEventFocus: null as Event | null
  });
  
  // State for UI controls
  const [uiState, setUiState] = useState({
    viewMode: 'list' as 'list' | 'grid' | 'calendar',
    showForm: false,
    showVisibilitySettings: false,
    deleteConfirmOpen: false,
    eventToDelete: null as Event | null,
    filter: 'all' as FilterStatus,
    searchTerm: '',
    isSubmitting: false
  });

  // Custom hooks with improved performance
  const { 
    checkSubscriptionDirectly, 
    isCheckingSubscription, 
    subscriptionStatus 
  } = useSubscriptionCheck();
  
  const { 
    events, 
    isLoadingEvents, 
    loadEvents, 
    createEvent,
    updateEvent,
    deleteEvent,
    getEventDetails
  } = useEventManagement();
  
  // useEffect to log events when they change (for debugging)
  useEffect(() => {
    if (events) {
      console.log("[Page.tsx] Events from useEventManagement:", JSON.stringify(events, null, 2));
    }
  }, [events]);
  
  // Refs for tracking loading state
  const loadingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasTriggeredInitialLoad = useRef(false);

  // Add a ref for the refresh button
  const refreshButtonRef = useRef<HTMLButtonElement>(null);

  // Add pagination state
  const [pagination, setPagination] = useState({
    currentPage: 1,
    itemsPerPage: 10,
    totalPages: 1
  });

  // Function to update appState
  const updateAppState = useCallback((updates: Partial<typeof appState>) => {
    setAppState(prev => ({ ...prev, ...updates }));
  }, []);

  // Function to update uiState
  const updateUiState = useCallback((updates: Partial<typeof uiState>) => {
    setUiState(prev => ({ ...prev, ...updates }));
  }, []);

  // Function to check if user has reached event limits
  const checkEventLimits = useCallback(() => {
    // Use subscriptionStatus.features.maxEvents directly, providing a default if features might not be ready
    const maxEvents = subscriptionStatus.features?.maxEvents ?? 10; // Default to 10 if somehow not set
    if (events.length >= maxEvents) {
      updateAppState({ hasReachedLimit: true });
      console.log(`User has reached event limit: ${events.length}/${maxEvents}`);
    } else {
      updateAppState({ hasReachedLimit: false });
    }
  }, [events.length, subscriptionStatus.features, updateAppState]);

  // Function to handle event limit check directly before taking an action
  const handleLimitCheck = useCallback(() => {
    const maxEvents = subscriptionStatus.features?.maxEvents ?? 10;
    const hasReachedLimit = events.length >= maxEvents;
    
    // Update state regardless if it's already set or not, to ensure consistency
    updateAppState({ hasReachedLimit });
    
    if (hasReachedLimit) {
      toast.error(`You've reached your event limit of ${maxEvents}. Please upgrade your plan to create more events.`, {
        duration: 4000,
        icon: '⚠️',
        style: { background: '#362535', color: '#ffffff', border: '1px solid #f87171' }
      });
      return true; // Has reached limit
    }
    return false; // Hasn't reached limit
  }, [events.length, subscriptionStatus.features, updateAppState]);
  
  // Load CSS fixes when needed
  const fixCssLoading = useCallback(() => {
    // Fix any CSS loading issues
    if (typeof document !== 'undefined') {
      document.body.classList.remove('loading');
    }
  }, []);
  
  const checkForFrameworkCss = useCallback(() => {
    // Ensure framework CSS is loaded
    if (typeof document !== 'undefined') {
      const style = document.createElement('style');
      style.textContent = `
        .framework-loaded { opacity: 1; }
      `;
      document.head.appendChild(style);
    }
  }, []);
  
  // Function to handle search changes
  const handleSearchChange = useCallback((value: string) => {
    updateUiState({ searchTerm: value });
  }, [updateUiState]);

  // Function to handle pagination changes
  const handlePageChange = useCallback((newPage: number) => {
    setPagination(prev => ({
      ...prev,
      currentPage: newPage
    }));
  }, []);

  // Function to refresh events data
  const refreshEvents = useCallback(async () => {
    updateAppState({ isProcessingAction: true });
    
    try {
      await loadEvents();
      toast.success('Events refreshed');
      } catch (error) {
      toast.error('Failed to refresh events');
    } finally {
      updateAppState({ isProcessingAction: false });
    }
  }, [loadEvents, updateAppState]);

  // Function to handle deletion
  const handleDelete = useCallback(async (eventId: string) => {
    updateAppState({ isProcessingAction: true });
    
    try {
      await deleteEvent(eventId);
      toast.success('Event deleted successfully');
      updateUiState({ 
        deleteConfirmOpen: false, 
        eventToDelete: null 
      });
      } catch (error) {
      console.error('Error deleting event:', error);
      toast.error('Failed to delete event');
    } finally {
      updateAppState({ isProcessingAction: false });
    }
  }, [deleteEvent, updateAppState, updateUiState]);

  // Function to handle visibility settings update
  const handleSaveVisibility = useCallback(async (eventId: string, settings: EventVisibilityType) => {
    updateAppState({ isProcessingAction: true });
    
    try {
      // Directly pass the settings object to updateEvent
      await updateEvent(eventId, { visibility: settings }); // Pass as { visibility: settings } 
                                                       // to match how PUT handler might expect partial updates

      updateUiState({ showVisibilitySettings: false });
      toast.success('Visibility settings updated');
    } catch (error) {
      console.error('Error updating visibility settings:', error);
      toast.error('Failed to update visibility settings');
    } finally {
      updateAppState({ isProcessingAction: false });
    }
  }, [updateEvent, updateAppState, updateUiState]);

  // Form submission handler
  const handleEventSubmit = useCallback(async (formData: FormData) => {
    // Check limits directly before form submission 
    if (handleLimitCheck()) {
      updateUiState({ showForm: false });
      return;
    }
    
    updateAppState({ isProcessingAction: true });
    updateUiState({ isSubmitting: true });
    
    try {
      await createEvent(formData);
      toast.success('Event created successfully');
      
      // Refresh events after successful creation
      await loadEvents();
      
      // Close the form
      updateUiState({ showForm: false });
    } catch (error) {
      console.error('Error submitting event:', error);
      toast.error('Failed to create event');
    } finally {
      updateAppState({ isProcessingAction: false });
      updateUiState({ isSubmitting: false });
    }
  }, [
    updateAppState, 
    updateUiState, 
    loadEvents, 
    createEvent,
    handleLimitCheck
  ]);

  // Calculate event metrics
  const eventMetrics = useMemo(() => {
    const total = events.length;
    const upcoming = events.filter(e => new Date(e.date) > new Date()).length;
    const completed = events.filter(e => e.status === 'completed').length;
    const cancelled = events.filter(e => e.status === 'cancelled').length;
    
    return { total, upcoming, completed, cancelled };
  }, [events]);

  // Filter events based on search term and status filter
  const filteredEvents = useMemo(() => {
    // First filter by search term
    let filtered = events;
    
    if (uiState.searchTerm) {
      const term = uiState.searchTerm.toLowerCase();
      filtered = filtered.filter(event => 
        event.title.toLowerCase().includes(term) || 
        (event.description && event.description.toLowerCase().includes(term))
      );
    }
    
    // Then filter by status
    if (uiState.filter !== 'all') {
      const now = new Date();
      
      switch (uiState.filter) {
        case 'upcoming':
          filtered = filtered.filter(event => new Date(event.date) > now);
          break;
        case 'ongoing':
          // For ongoing, check if current time is between start and end
          filtered = filtered.filter(event => {
            const eventDate = new Date(event.date);
            const eventEnd = event.endDate ? new Date(event.endDate) : new Date(eventDate.getTime() + (event.duration || 60) * 60000);
            return eventDate <= now && eventEnd >= now;
          });
          break;
        case 'expired':
          filtered = filtered.filter(event => {
            const eventDate = new Date(event.date);
            const eventEnd = event.endDate ? new Date(event.endDate) : new Date(eventDate.getTime() + (event.duration || 60) * 60000);
            return eventEnd < now && event.status !== 'completed' && event.status !== 'cancelled';
          });
          break;
        case 'completed':
          filtered = filtered.filter(event => event.status === 'completed');
          break;
        case 'cancelled':
          filtered = filtered.filter(event => event.status === 'cancelled');
          break;
        case 'draft':
          filtered = filtered.filter(event => event.status === 'draft');
          break;
        case 'published':
          // Use as string comparison to avoid type issues
          filtered = filtered.filter(event => 
            event.status === 'upcoming' || 
            event.status === 'live'
          );
          break;
      }
    }
    
    return filtered;
  }, [events, uiState.searchTerm, uiState.filter]);

  // Calculate paginated events
  const paginatedEvents = useMemo(() => {
    const startIndex = (pagination.currentPage - 1) * pagination.itemsPerPage;
    const endIndex = startIndex + pagination.itemsPerPage;
    return filteredEvents.slice(startIndex, endIndex);
  }, [filteredEvents, pagination.currentPage, pagination.itemsPerPage]);

  // Pagination component
  const Pagination = () => {
    const totalPages = pagination.totalPages;
    
    if (totalPages <= 1) return null;
    
    return (
      <div className="flex justify-center my-6">
        <nav className="flex items-center gap-1">
          <button
            onClick={() => handlePageChange(Math.max(1, pagination.currentPage - 1))}
            disabled={pagination.currentPage === 1}
            className={`px-3 py-1 rounded ${
              pagination.currentPage === 1
                ? 'text-gray-500 bg-gray-800/50 cursor-not-allowed'
                : 'text-white bg-gray-800 hover:bg-gray-700'
            }`}
          >
            Previous
          </button>
          
          {[...Array(totalPages)].map((_, i) => (
            <button
              key={i}
              onClick={() => handlePageChange(i + 1)}
              className={`w-8 h-8 flex items-center justify-center rounded ${
                pagination.currentPage === i + 1
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
              }`}
            >
              {i + 1}
            </button>
          ))}
          
          <button
            onClick={() => handlePageChange(Math.min(totalPages, pagination.currentPage + 1))}
            disabled={pagination.currentPage === totalPages}
            className={`px-3 py-1 rounded ${
              pagination.currentPage === totalPages
                ? 'text-gray-500 bg-gray-800/50 cursor-not-allowed'
                : 'text-white bg-gray-800 hover:bg-gray-700'
            }`}
          >
            Next
          </button>
        </nav>
      </div>
    );
  };

  // Handle freshStart parameter when creating another event
  useEffect(() => {
    if (freshStart && typeof window !== 'undefined') {
      localStorage.removeItem('event_form_draft');
      
      // Also clear any upload flags that might be stuck
      if (window) {
        (window as any).__IS_UPLOADING_FILE__ = false;
        document.body.classList.remove('file-uploading');
      }
      
      // Create a clean URL without the freshStart parameter
      const url = new URL(window.location.href);
      url.searchParams.delete('freshStart');
      window.history.replaceState({}, '', url.toString());
      
      // Show notification
      toast.success('Ready to create a new event');
    }
  }, [freshStart]);

  // Improve loading timer with a single timeout
  useEffect(() => {
    if (!appState.isCheckingPermissions || appState.bypassLoading || hasTriggeredInitialLoad.current) {
      return;
    }
    
    // Clear any existing timer
    if (loadingTimerRef.current) {
      clearTimeout(loadingTimerRef.current);
    }
    
    // Set single timeout to bypass loading after a reasonable delay
    loadingTimerRef.current = setTimeout(() => {
      updateAppState({ 
        bypassLoading: true, 
        isCheckingPermissions: false 
      });
    }, 5000);
    
    return () => {
      if (loadingTimerRef.current) {
        clearTimeout(loadingTimerRef.current);
      }
    };
  }, [appState.isCheckingPermissions, appState.bypassLoading, updateAppState]);

  // Improved effect for CSS loading fixes
  useEffect(() => {
    // Prefetch important routes
    router.prefetch('/organizer/subscribe');
    router.prefetch('/api/events');
    
    // Check for cached session
    const cachedSessionStr = localStorage.getItem('userSession');
    if (cachedSessionStr) {
      try {
        const cachedSession = JSON.parse(cachedSessionStr);
        if (new Date(cachedSession.expires) > new Date()) {
          sessionChecked.current = true;
        }
      } catch (e) {
        console.error('Error parsing cached session:', e);
      }
    }
  }, [router]);

  // Cache session data
  useEffect(() => {
    if (session && status === 'authenticated') {
      try {
        localStorage.setItem('userSession', JSON.stringify({
          expires: session.expires,
          timestamp: Date.now()
        }));
      } catch (e) {
        console.error('Error caching session:', e);
      }
    }
  }, [session, status]);

  // Improved permission checking
  const checkPermissions = useCallback(async () => {
    // Skip if we've already checked
    if (!appState.isCheckingPermissions) return;
    
    try {
      updateAppState({ isLoadingPermissions: true });
      
      // Check subscription - only if user is loaded
      if (user?.email) {
        console.log("Checking subscription for user:", user.email);
        const hasValidSubscription = await checkSubscriptionDirectly();
        
        if (!hasValidSubscription) {
          console.log("No valid subscription found - redirecting to subscribe page");
          toast.error("You need an active subscription to manage events");
          router.push('/organizer/subscribe');
          return;
        }
        
        console.log("Valid subscription found - subscription check complete");

        // We'll load events after permissions check is complete in the useEffect
      }
    } catch (error) {
      console.error("Error checking permissions:", error);
      updateAppState({ 
        loadError: error instanceof Error ? error.message : "Unknown error checking permissions" 
      });
    } finally {
      updateAppState({ 
        isCheckingPermissions: false, 
        isLoadingPermissions: false 
      });
    }
  }, [
    appState.isCheckingPermissions, 
    user, 
    checkSubscriptionDirectly, 
    router, 
    subscriptionStatus, 
    updateAppState
  ]);

  // Call checkPermissions when component mounts
  useEffect(() => {
    if (status === 'authenticated' && !isUserLoading && !hasTriggeredInitialLoad.current) {
      hasTriggeredInitialLoad.current = true;
      
      // Check permissions first
      checkPermissions().then(() => {
        // Always force load all events after permissions check
        console.log("Initial page load - force loading all events");
        loadEvents().then(() => {
          // Check event limits after loading events
          checkEventLimits();
        });
      });
    }
  }, [status, isUserLoading, checkPermissions, loadEvents, checkEventLimits]);
  
  // Add another effect to ensure events are loaded when page is refreshed
  useEffect(() => {
    // If we're authenticated but no events are loaded, force load them
    if (status === 'authenticated' && !isLoadingEvents && events.length === 0) {
      console.log("No events found on page load - force loading events");
      
      // Clear subscription cache
      if (typeof window !== 'undefined') {
        const userId = session?.user?.id;
        if (userId) {
          localStorage.removeItem(`subscription_user_${userId}`);
          sessionStorage.removeItem(`subscription_user_${userId}`);
          console.log("Cleared subscription cache for user:", userId);
        }
      }
      
      loadEvents().then(() => {
        checkEventLimits();
      });
    }
  }, [status, events.length, isLoadingEvents, loadEvents, checkEventLimits, session?.user?.id]);

  // Effect to load events on initial render
  useEffect(() => {
    if (!hasTriggeredInitialLoad.current && !isLoadingEvents) {
      hasTriggeredInitialLoad.current = true;
      
      const loadInitialEvents = async () => {
    updateAppState({ isProcessingAction: true });
    
    try {
          await loadEvents();
    } catch (error) {
          console.error('Error loading initial events:', error);
          updateAppState({ loadError: 'Failed to load events' });
    } finally {
      updateAppState({ isProcessingAction: false });
        }
      };
      
      loadInitialEvents();
    }
  }, [loadEvents, isLoadingEvents, updateAppState]);

  // Effect to calculate pagination based on filtered events
  useEffect(() => {
    if (filteredEvents.length > 0) {
      const totalPages = Math.ceil(filteredEvents.length / pagination.itemsPerPage);
      
    setPagination(prev => ({
      ...prev,
        totalPages: Math.max(1, totalPages)
    }));
  
      // Adjust current page if it's out of bounds
      if (pagination.currentPage > totalPages) {
    setPagination(prev => ({
      ...prev,
          currentPage: totalPages
        }));
      }
    }
  }, [filteredEvents.length, pagination.itemsPerPage, pagination.currentPage]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      // Clear any pending timers
      if (loadingTimerRef.current) {
        clearTimeout(loadingTimerRef.current);
        loadingTimerRef.current = null;
      }
    };
  }, []);

  // Render loading screen
  if (status === 'loading' || appState.isCheckingPermissions) {
    return (
      <LoadingScreen 
        message={isCheckingSubscription ? "Checking subscription..." : "Loading your events..."}
      />
    );
  }

  // Render error screen
  if (appState.loadError) {
    return (
      <ErrorScreen 
        error={appState.loadError}
        onRetry={checkPermissions}
      />
    );
  }

  // Render limit reached screen
  if (appState.hasReachedLimit) {
    return (
      <LimitReachedScreen 
        currentLimit={subscriptionStatus.features?.maxEvents ?? 10}
        currentSubscription={subscriptionStatus.type || "basic"}
        onUpgrade={() => router.push('/organizer/subscribe')}
      />
    );
  }

  // Modify the NoEventsMessage component inside the JSX to include the test event button
  const NoEventsMessage = () => (
    <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-8 flex flex-col items-center justify-center text-center space-y-4 shadow-md">
      <div className="relative">
        <div className="absolute inset-0 bg-indigo-500/20 rounded-full blur-xl"></div>
        <AlertCircle className="w-16 h-16 text-indigo-400 mb-2 relative z-10" />
      </div>
      <h3 className="text-2xl font-semibold text-white mb-1">No Events Found</h3>
      <p className="text-gray-300 max-w-md">
        You haven't created any events yet. Create your first event to get started organizing and managing your activities.
      </p>
      <div className="flex flex-col gap-3 mt-4 sm:flex-row">
        <button
          onClick={() => updateUiState({ showForm: true })}
          className="px-5 py-3 bg-gray-800/70 border border-gray-600/50 rounded-lg text-white font-medium transition-all duration-200 flex items-center justify-center gap-2 shadow-md hover:bg-gray-700/80 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:ring-offset-2 focus:ring-offset-black transform active:translate-y-[1px]"
          aria-label="Create your first event"
        >
          <PlusCircle className="w-5 h-5 text-teal-300" />
          Create Your First Event
        </button>
      </div>
    </div>
  );

  // Render main content
  return (
    <ErrorBoundary>
      <div className="min-h-screen flex flex-col bg-gray-900 text-gray-200">
        <div className="container mx-auto px-4 pt-20 md:pt-24 pb-8 md:pb-10">
          <header className="mb-10">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
              <div className="py-2 mb-4 sm:mb-0">
                <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Your Events</h1>
                <p className="text-gray-300 text-sm md:text-base">Manage and organize all your events from one place</p>
                {(subscriptionStatus.checked && !isCheckingSubscription) && (
                  <p className="text-sm text-gray-400 mt-2">
                    Events Created: {events.length}/{
                      subscriptionStatus.features?.maxEvents === -1 || subscriptionStatus.features?.maxEvents === Infinity 
                      ? 'Unlimited' 
                      : subscriptionStatus.features?.maxEvents ?? 'N/A'}
                    {subscriptionStatus.features?.maxEvents !== -1 && subscriptionStatus.features?.maxEvents !== Infinity && (
                      <span className="text-gray-500"> (Current Plan Limit)</span>
                    )}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap gap-2 mb-4 sm:mb-0">
                <button
                  onClick={refreshEvents}
                  className="flex items-center gap-1 bg-gray-800/70 border border-gray-600/50 text-white px-3 py-1.5 rounded-lg shadow-md hover:bg-gray-700/80 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:ring-offset-2 focus:ring-offset-black transition-all duration-200 text-sm"
                  disabled={isLoadingEvents || appState.isProcessingAction}
                  ref={refreshButtonRef}
                  aria-label="Refresh events"
                >
                  {appState.isProcessingAction ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw size={16} className="text-blue-200"/>
                  )}
                  <span>Refresh</span>
                </button>
                <button
                  onClick={() => {
                    if (!handleLimitCheck()) {
                      updateUiState({ showForm: true });
                    }
                  }}
                  className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-4 py-2 rounded-lg shadow-lg transition-all duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 focus:ring-offset-black disabled:opacity-60 disabled:cursor-not-allowed"
                  disabled={isLoadingEvents || appState.isProcessingAction}
                  aria-label="Create new event"
                >
                  <Plus size={18} /> Create New Event
                </button>
              </div>
            </div>
            
            <div className="flex flex-col lg:flex-row lg:items-center gap-4 py-2 mt-4">
              {/* Search bar */}
              <div className="flex-1 max-w-md">
                <SearchBar 
                  searchQuery={uiState.searchTerm}
                  onSearchChange={handleSearchChange}
                  onClearSearch={() => updateUiState({ searchTerm: '' })}
                  placeholder="Search events..."
                />
              </div>
              
              {/* View controls */}
              <div className="flex flex-wrap items-center gap-2">
                <ViewControls 
                  viewMode={uiState.viewMode}
                  onViewChange={(mode) => updateUiState({ viewMode: mode })}
                />
              </div>
            </div>
          </header>
          
          {/* Event metrics - redesigned for better UI */}
          {events.length > 0 && (
            <div className="mb-8 bg-gradient-to-br from-gray-900/30 via-gray-800/40 to-gray-900/30 rounded-xl p-4 shadow-xl border border-gray-700/50">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: 'Total Events', value: eventMetrics?.total || 0, color: 'purple' },
                  { label: 'Upcoming', value: eventMetrics?.upcoming || 0, color: 'blue' },
                  { label: 'Completed', value: eventMetrics?.completed || 0, color: 'green' },
                  { label: 'Cancelled', value: eventMetrics?.cancelled || 0, color: 'red' },
                ].map((metric) => (
                  <div
                    key={metric.label}
                    className={`
                      bg-gradient-to-br from-${metric.color}-900/50 via-${metric.color}-800/40 to-black/30
                      border border-${metric.color}-700/60 rounded-lg p-4 text-center shadow-lg
                      hover:shadow-xl hover:border-${metric.color}-600/80
                      transition-all duration-300 ease-in-out transform hover:-translate-y-1 hover:scale-[1.03]
                    `}
                  >
                    <p className={`text-3xl font-bold text-${metric.color}-300 mb-1 drop-shadow-lg`}>{metric.value}</p>
                    <p className={`text-${metric.color}-200/90 text-xs font-semibold uppercase tracking-wider`}>{metric.label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Display Remaining Quota - Improved UI/UX */}
          {!isLoadingEvents && (
            <div className="text-center text-sm mb-8 -mt-2 bg-gray-800/30 border border-gray-700/40 rounded-lg py-3 px-4 max-w-md mx-auto shadow-md">
              { (subscriptionStatus.features?.maxEvents === Infinity || (subscriptionStatus.features?.maxEvents ?? 0) >= 9999 ) ? (
                <span className="text-green-400 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /> 
                  </svg>
                  Unlimited event creation enabled.
                </span>
              ) : (
                <span className="text-gray-300">
                  Events Created: 
                  <strong className="text-xl font-bold text-purple-300 mx-1.5">{events.length}</strong> 
                  / 
                  <strong className="text-xl font-bold text-purple-300 mx-1.5">{subscriptionStatus.features?.maxEvents ?? 10}</strong>
                  <span className="text-gray-400 ml-2">(Current Plan Limit)</span>
                </span>
              )}
            </div>
          )}
          
          {/* Upgrade Subscription Button */}
          <div className="text-center mb-10 -mt-4 flex flex-wrap justify-center gap-3"> {/* Adjust spacing as needed */}
            <Link 
              href="/organizer/subscribe" 
              className="inline-flex items-center gap-2 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white px-5 py-2.5 rounded-lg shadow-lg transition-all duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:ring-offset-2 focus:ring-offset-black text-sm font-medium"
            >
              <ArrowUpCircle size={18} />
              Manage Subscription / Upgrade Plan
            </Link>
            
            <button
              onClick={async () => {
                toast.loading("Refreshing subscription status...");
                // Clear cache
                if (typeof window !== 'undefined' && session?.user?.id) {
                  localStorage.removeItem(`subscription_user_${session.user.id}`);
                  sessionStorage.removeItem(`subscription_user_${session.user.id}`);
                }
                
                // Force refresh subscription check
                const result = await checkSubscriptionDirectly(false, true);
                toast.dismiss();
                
                if (result) {
                  toast.success("Subscription status refreshed successfully!");
                  // Re-check event limits with fresh data
                  checkEventLimits();
                } else {
                  toast.error("Failed to refresh subscription status");
                }
              }}
              className="inline-flex items-center gap-2 bg-purple-700 hover:bg-purple-800 text-white px-5 py-2.5 rounded-lg shadow-lg transition-all duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 focus:ring-offset-black text-sm font-medium"
              disabled={isCheckingSubscription}
            >
              <RefreshCw size={16} className={isCheckingSubscription ? "animate-spin" : ""} />
              Refresh Subscription
            </button>
          </div>
          
          {/* Events list/grid/calendar based on viewMode */}
          <main className="transition-all duration-200">
        {isLoadingEvents ? (
              <div className="flex justify-center items-center py-12">
                <Loader className="w-8 h-8 text-indigo-500 animate-spin mr-3" />
                <span className="text-gray-300">Loading your events...</span>
            </div>
            ) : events.length === 0 ? (
              <NoEventsMessage />
            ) : (
              <>
                {uiState.viewMode === 'list' && (
                  <EventList 
                    events={pagination.totalPages > 1 ? paginatedEvents : events}
                    isLoading={isLoadingEvents}
                    showControlsBar={false}
                    onDelete={(eventId) => {
                      const event = events.find(e => e._id === eventId);
                      if (event) updateUiState({ deleteConfirmOpen: true, eventToDelete: event });
                    }}
                    onVisibilityControl={(eventId) => {
                      const event = events.find(e => e._id === eventId);
                      if (event) {
                        setAppState(prev => ({...prev, currentEventFocus: event})); 
                        updateUiState({ showVisibilitySettings: true });
                      }
                    }}
                  />
                )}
                
                {uiState.viewMode === 'grid' && (
              <EventGrid 
                    events={pagination.totalPages > 1 ? paginatedEvents : filteredEvents}
                    onDelete={(eventId) => {
                      const event = events.find(e => e._id === eventId);
                      if (event) updateUiState({ deleteConfirmOpen: true, eventToDelete: event });
                    }}
                  />
                )}
                
                {uiState.viewMode === 'calendar' && (
              <EventCalendarView 
                    events={events}
                    onDateSelect={(date) => console.log("Date selected:", date)}
                  />
                )}

                {/* Add pagination if needed */}
                {(uiState.viewMode === 'list' || uiState.viewMode === 'grid') && 
                  filteredEvents.length > pagination.itemsPerPage && 
                  <Pagination />}
              </>
            )}
          </main>
      </div>

        {/* Delete confirmation modal */}
        <DeleteConfirmationModal 
          isOpen={uiState.deleteConfirmOpen && !!uiState.eventToDelete}
          isProcessing={appState.isProcessingAction}
          eventName={uiState.eventToDelete?.title || 'this event'}
          onConfirm={() => {
            if (uiState.eventToDelete) {
              handleDelete(uiState.eventToDelete._id);
            }
          }}
          onCancel={() => updateUiState({ 
            deleteConfirmOpen: false, 
            eventToDelete: null 
          })}
        />
        
        {/* Event form modal */}
        <EventFormModal
          isOpen={uiState.showForm}
          onClose={() => updateUiState({ 
            showForm: false,
          })}
          onSubmit={handleEventSubmit}
        />
        
        {/* Visibility Settings Modal */}
        <VisibilitySettingsModal
          isOpen={uiState.showVisibilitySettings && !!appState.currentEventFocus}
          initialVisibility={appState.currentEventFocus?.visibility || 'public'}
          eventId={appState.currentEventFocus?._id || ''}
          onClose={() => {
            updateUiState({ 
              showVisibilitySettings: false,
            });
            setAppState(prev => ({...prev, currentEventFocus: null}));
          }}
          onSave={(newVisibility) => { 
              if (appState.currentEventFocus?._id) {
                handleSaveVisibility(appState.currentEventFocus._id, newVisibility);
              } else {
                console.error("Cannot save visibility: Event ID missing from current focus.");
                toast.error("Could not save visibility settings.");
              }
          }}
        />
    </div>
    </ErrorBoundary>
  );
}

// Main component
export default function CreateEventPage() {
  return (
    <Suspense fallback={<div className="fixed inset-0 bg-gray-900 flex items-center justify-center z-[100]"><Loader className="w-12 h-12 text-purple-500 animate-spin" /></div>}>
      <CreateEventPageContent />
    </Suspense>
  );
}