"use client"
import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Search, Filter, Calendar, Grid, List, Clock3, CheckCircle2, XCircle, AlertCircle, Clock, X, FileEdit, Globe } from 'lucide-react';
import { Event } from '../../../../../types/event';
import EventListItem from './EventListItem';
import EventGrid from './EventGrid';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams } from 'next/navigation';

interface EventListProps {
  events: Event[];
  onDelete?: (id: string) => void;
  onManage?: (id: string) => void;
  onVisibilityControl?: (id: string) => void;
  showActions?: boolean;
  isLoading?: boolean;
  showControlsBar?: boolean;
}

// Define filter statuses with associated icons and colors
const filterOptions = [
  { value: 'all', label: 'All Events', icon: Calendar },
  { value: 'upcoming', label: 'Upcoming', icon: Clock3, color: 'text-blue-400' },
  { value: 'ongoing', label: 'Ongoing', icon: Clock, color: 'text-green-400' },
  { value: 'expired', label: 'Expired', icon: AlertCircle, color: 'text-orange-400' },
  { value: 'completed', label: 'Completed', icon: CheckCircle2, color: 'text-gray-400' },
  { value: 'cancelled', label: 'Cancelled', icon: XCircle, color: 'text-red-400' },
  { value: 'draft', label: 'Draft', icon: FileEdit, color: 'text-yellow-400' },
  { value: 'published', label: 'Published', icon: Globe, color: 'text-teal-400' }
];

type FilterStatus = 'all' | 'upcoming' | 'ongoing' | 'expired' | 'completed' | 'cancelled' | 'draft' | 'published';

// Debounce function to improve search performance
const useDebounce = <T,>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

const EventList: React.FC<EventListProps> = ({ 
  events, 
  onDelete, 
  onManage,
  onVisibilityControl,
  showActions = true,
  isLoading = false,
  showControlsBar = true
}) => {
  const [view, setView] = useState<'list' | 'grid'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<FilterStatus>('all');
  
  // Use debounce for search to improve performance
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  
  // Get params with correct typing
  const params = useParams();
  const id = params?.id as string | undefined;

  // Helper function to check if an event is expired - memoized for performance
  const isEventExpired = useCallback((event: Event): boolean => {
    if (!event.date) return false;
    
    try {
      const now = new Date();
      const eventDate = new Date(event.date);
      
      // If the event has an end date, use that for comparison
      if (event.endDate) {
        const endDate = new Date(event.endDate);
        return endDate < now;
      }
      
      // If it has a duration, calculate the end time
      if (event.duration && typeof event.duration === 'number') {
        const endTime = new Date(eventDate.getTime() + (event.duration * 60 * 1000));
        return endTime < now;
      }
      
      // Default to checking if the start date is in the past
      return eventDate < now;
    } catch (e) {
      return false;
    }
  }, []);

  // Get the effective status of an event - memoized for performance
  const getEffectiveStatus = useCallback((event: Event): string => {
    // If event has explicit completed/cancelled status, prioritize it
    if (event.status === 'completed' || event.status === 'cancelled') {
      return event.status;
    }
    
    // Auto-detect expired status for past events
    if (isEventExpired(event) && event.status !== 'ongoing') {
      return 'expired';
    }
    
    // Return the event's actual status or default to upcoming
    return event.status || 'upcoming';
  }, [isEventExpired]);

  const filteredEvents = useMemo(() => {
    return events
      .filter(event => {
        // Search term matching with null checks
        const title = event?.title?.toLowerCase() ?? '';
        const description = event?.description?.toLowerCase() ?? '';
        const shortDescription = event?.shortDescription?.toLowerCase() ?? '';
        const searchLower = debouncedSearchTerm.toLowerCase();
        
        const matchesSearch = !debouncedSearchTerm || 
          title.includes(searchLower) || 
          description.includes(searchLower) ||
          shortDescription.includes(searchLower);

        // Filter by event status
        if (filter === 'all') return matchesSearch;
        const effectiveStatus = getEffectiveStatus(event);
        return matchesSearch && effectiveStatus === filter;
      })
      .sort((a, b) => {
        const statusA = getEffectiveStatus(a);
        const statusB = getEffectiveStatus(b);
        
        // Sort Priority 1: Ongoing events first
        if (statusA === 'ongoing' && statusB !== 'ongoing') return -1;
        if (statusA !== 'ongoing' && statusB === 'ongoing') return 1;
        
        // Sort Priority 2: Upcoming events next
        if (statusA === 'upcoming' && statusB !== 'upcoming' && statusB !== 'ongoing') return -1;
        if (statusA !== 'upcoming' && statusB === 'upcoming' && statusA !== 'ongoing') return 1;
        
        // Sort Priority 3: For all other statuses, or if statuses are the same (and not ongoing/upcoming),
        // sort by date.
        const dateA = a?.date ? new Date(a.date).getTime() : 0;
        const dateB = b?.date ? new Date(b.date).getTime() : 0;
        const now = Date.now();
        
        // If both dates are valid and in the future, sort by closest future date first (ascending date).
        if (dateA > now && dateB > now) {
          return dateA - dateB;
        }
        // If both dates are valid and in the past, sort by most recent past date first (descending date).
        if (dateA <= now && dateB <= now && dateA !== 0 && dateB !== 0) { // Ensure dates are not 0 (invalid/missing)
          return dateB - dateA;
        }
        // If one date is future and one is past, future events come before past events.
        if (dateA > now && dateB <= now) return -1;
        if (dateA <= now && dateB > now) return 1;

        // Fallback for events with same status and one or both have invalid/missing dates:
        // If dateA is valid and dateB is not, A comes first.
        if (dateA !== 0 && dateB === 0) return -1;
        // If dateB is valid and dateA is not, B comes first.
        if (dateB !== 0 && dateA === 0) return 1;
        
        // If both dates are 0 or statuses are identical and don't fall into above, maintain original order or sort by title as a final tie-breaker.
        return a.title.localeCompare(b.title);
      });
  }, [events, debouncedSearchTerm, filter, getEffectiveStatus]);

  // Counts for status badges
  const statusCounts = useMemo(() => {
    return {
      all: events.length,
      upcoming: events.filter(e => getEffectiveStatus(e) === 'upcoming').length,
      ongoing: events.filter(e => getEffectiveStatus(e) === 'ongoing').length,
      expired: events.filter(e => getEffectiveStatus(e) === 'expired').length,
      completed: events.filter(e => getEffectiveStatus(e) === 'completed').length,
      cancelled: events.filter(e => getEffectiveStatus(e) === 'cancelled').length,
      draft: events.filter(e => getEffectiveStatus(e) === 'draft').length,
      published: events.filter(e => getEffectiveStatus(e) === 'published').length
    };
  }, [events, getEffectiveStatus]);

  // Add loading skeleton state
  const EventSkeleton = () => (
    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-4 mb-4 shadow-lg animate-pulse">
      <div className="flex flex-col md:flex-row gap-5">
        <div className="w-full md:w-48 h-36 bg-gray-700/50 rounded-lg md:shrink-0"></div>
        <div className="flex-1 flex flex-col">
          <div className="flex items-start justify-between gap-2">
            <div className="h-6 bg-gray-700/50 rounded w-1/2"></div>
            <div className="flex items-center gap-2">
              <div className="h-5 bg-gray-700/50 rounded w-16"></div>
              <div className="h-5 bg-gray-700/50 rounded w-20"></div>
            </div>
          </div>
          <div className="mt-4 space-y-3">
            <div className="h-4 bg-gray-700/50 rounded w-3/4"></div>
            <div className="h-4 bg-gray-700/50 rounded w-1/2"></div>
            <div className="h-4 bg-gray-700/50 rounded w-5/6"></div>
          </div>
          <div className="mt-auto pt-4 flex justify-end gap-2">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="w-9 h-9 bg-gray-700/50 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  // Add dropdown state to replace direct DOM manipulation
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  // Handle click outside to close dropdown
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Add keyboard navigation for dropdown
  const handleDropdownKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsDropdownOpen(false);
    }
  };
  
  // Close dropdown when document is clicked outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    
    // Only add event listener when dropdown is open
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isDropdownOpen]);

  // Add virtualization functionality for large lists
  const VISIBLE_THRESHOLD = 15; // Number of items beyond which we enable virtualization
  const ITEM_HEIGHT = 170; // Approximate height of an event item in pixels
  
  // Virtual list state
  const [startIndex, setStartIndex] = useState(0);
  const [visibleItemCount, setVisibleItemCount] = useState(10);
  const listContainerRef = useRef<HTMLDivElement>(null);
  
  // Update virtual list rendering on scroll
  useEffect(() => {
    // Only use virtualization when not filtering
    if (filteredEvents.length <= VISIBLE_THRESHOLD || filter !== 'all' || debouncedSearchTerm || view === 'grid') return;
    
    const handleScroll = () => {
      if (!listContainerRef.current) return;
      
      const scrollTop = window.scrollY;
      const containerTop = listContainerRef.current.offsetTop;
      const viewportHeight = window.innerHeight;
      
      // Calculate which items should be visible
      const newStartIndex = Math.max(0, Math.floor((scrollTop - containerTop) / ITEM_HEIGHT));
      const newVisibleCount = Math.ceil(viewportHeight / ITEM_HEIGHT) + 2; // Add buffer
      
      setStartIndex(newStartIndex);
      setVisibleItemCount(newVisibleCount);
    };
    
    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Initial calculation
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [filteredEvents.length, filter, debouncedSearchTerm, view]);
  
  // Get virtual list slice
  const virtualItems = useMemo(() => {
    // Disable virtualization when filtering or in grid view
    if (filteredEvents.length <= VISIBLE_THRESHOLD || view === 'grid' || filter !== 'all' || debouncedSearchTerm) {
      return filteredEvents;
    }
    
    return filteredEvents.slice(
      startIndex,
      Math.min(startIndex + visibleItemCount, filteredEvents.length)
    );
  }, [filteredEvents, startIndex, visibleItemCount, view, filter, debouncedSearchTerm]);
  
  // Enhanced empty state component
  const EmptyState = () => (
    <div className="bg-gray-800/30 border border-gray-700/30 rounded-lg p-5 text-center">
      <div className="w-12 h-12 mx-auto mb-3 bg-gray-700/30 rounded-full flex items-center justify-center">
        <Calendar className="w-6 h-6 text-indigo-400 opacity-50" />
      </div>
      <h3 className="text-lg font-medium text-white mb-1">No events found</h3>
      <p className="text-gray-400 text-sm mb-3">
        {searchTerm 
          ? `No events matching "${searchTerm}"` 
          : filter !== 'all' 
            ? `No ${filter} events found` 
            : 'Create your first event to get started'}
      </p>
      {filter !== 'all' && (
        <button 
          onClick={() => setFilter('all')}
          className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/40 border border-indigo-500/30 rounded-lg text-indigo-400 text-sm transition-colors"
        >
          Clear Filter
        </button>
      )}
    </div>
  );

  return (
    <div className="space-y-3 mt-4">
      {/* Filter Status Badges - Always show these */}
      <div className="flex flex-wrap gap-1.5">
        {filterOptions.map(option => {
          const count = statusCounts[option.value as keyof typeof statusCounts] || 0;
          const isActive = filter === option.value;
          // Skip rendering badges with zero count unless it's the active filter or 'all'
          if (count === 0 && !isActive && option.value !== 'all') return null;
          
          return (
          <button
            key={option.value}
            onClick={() => setFilter(option.value as FilterStatus)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs transition-colors ${
                isActive 
                  ? 'bg-indigo-600/40 text-indigo-300 border border-indigo-700/50 shadow-inner' 
                : 'text-gray-400 border border-gray-700/50 hover:bg-gray-700/50'
            }`}
              aria-pressed={isActive}
              aria-label={`Filter by ${option.label} (${count})`}
          >
            <option.icon className={`w-3 h-3 ${option.color || 'text-indigo-400'}`} />
            <span>{option.label}</span>
            <span className={`ml-1 text-xs px-1 py-0.5 rounded-full ${
                isActive
                  ? 'bg-indigo-700/70 text-indigo-300' 
                : 'bg-gray-800/90 text-gray-400'
            }`}>
                {count}
            </span>
          </button>
          );
        })}
      </div>
      
      {/* Optional Search and Filters Bar - Only shown if showControlsBar is true */}
      {showControlsBar && (
        <div className="flex flex-col gap-4 bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 p-4 rounded-xl shadow-lg mb-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search events..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-700/50 border border-gray-600/50 rounded-lg text-white placeholder-gray-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-colors"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 mt-4 md:mt-0">
              <div className="flex items-center gap-2 bg-gray-700/50 p-1 rounded-lg border border-gray-600/50 shadow-md">
                <button
                  onClick={() => setView('list')}
                  className={`p-2 rounded-md transition-all ${
                    view === 'list' 
                      ? 'bg-indigo-600/40 text-indigo-300 shadow-inner' 
                      : 'text-gray-400 hover:text-white hover:bg-gray-600/50'
                  }`}
                  aria-label="List view"
                >
                  <List className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setView('grid')}
                  className={`p-2 rounded-md transition-all ${
                    view === 'grid' 
                      ? 'bg-indigo-600/40 text-indigo-300 shadow-inner' 
                      : 'text-gray-400 hover:text-white hover:bg-gray-600/50'
                  }`}
                  aria-label="Grid view"
                >
                  <Grid className="w-5 h-5" />
                </button>
              </div>

              {/* Status filter dropdown */}
              <div className="relative" ref={dropdownRef} onKeyDown={handleDropdownKeyDown}>
                <button
                  className="flex items-center gap-2 px-3 py-2.5 bg-gray-700/50 hover:bg-gray-600/50 border border-gray-600/50 rounded-lg text-gray-300 cursor-pointer shadow-md"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  aria-haspopup="true"
                  aria-expanded={isDropdownOpen}
                  aria-controls="status-filter-dropdown"
                  aria-label={`Filter events by status: ${filterOptions.find(opt => opt.value === filter)?.label || 'All Events'}`}
                >
                  <Filter className="w-4 h-4 text-indigo-400" />
                  <span>Filter: {filterOptions.find(opt => opt.value === filter)?.label || 'All Events'}</span>
                </button>
                
                {/* Dropdown with animation */}
                <AnimatePresence>
                  {isDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 w-56 bg-gray-800 border border-gray-700 rounded-xl shadow-xl z-10 overflow-hidden"
                      role="menu"
                      id="status-filter-dropdown"
                      aria-orientation="vertical"
                      aria-labelledby="filter-button"
                    >
                      <div className="max-h-64 overflow-y-auto py-1">
                        {filterOptions.map(option => (
                          <button
                            key={option.value}
                            onClick={() => {
                              setFilter(option.value as FilterStatus);
                              setIsDropdownOpen(false);
                            }}
                            className={`w-full text-left px-4 py-2.5 flex items-center gap-2 ${
                              filter === option.value ? 'bg-indigo-600/30 text-indigo-300' : 'hover:bg-gray-700/70 text-gray-300'
                            }`}
                            role="menuitem"
                            aria-current={filter === option.value ? 'true' : undefined}
                          >
                            <option.icon className={`w-4 h-4 ${option.color || 'text-indigo-400'}`} />
                            <span className="flex-1">{option.label}</span>
                            <div className="flex items-center">
                              <span className={`bg-gray-700/80 text-xs px-2 py-0.5 rounded-full ${
                                statusCounts[option.value as keyof typeof statusCounts] === 0 ? 'opacity-50' : ''
                              }`}>
                                {statusCounts[option.value as keyof typeof statusCounts] || 0}
                              </span>
                              {filter === option.value && (
                                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full ml-2"></div>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
          
          {/* Filtering Indicator - show when filtering a large list */}
          {(debouncedSearchTerm || filter !== 'all') && filteredEvents.length > VISIBLE_THRESHOLD && (
            <div className="bg-indigo-600/20 border border-indigo-500/30 rounded-lg p-2 mt-2 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-indigo-300">
                <Filter className="w-4 h-4" />
                <span>
                  {debouncedSearchTerm ? `Showing ${filteredEvents.length} results for "${debouncedSearchTerm}"` : 
                  `Showing ${filteredEvents.length} ${filter} events`}
                </span>
              </div>
              <button 
                onClick={() => {
                  setSearchTerm('');
                  setFilter('all');
                }}
                className="text-xs px-2 py-1 bg-indigo-600/30 hover:bg-indigo-600/50 rounded text-indigo-300"
              >
                Clear All Filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* Events List */}
      {isLoading ? (
        // Show skeleton loading UI
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <EventSkeleton key={index} />
          ))}
        </div>
      ) : filteredEvents.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-3">
          {/* For List View */}
          {view === 'list' && (
            <div className="space-y-3" ref={listContainerRef}>
              {/* Normal rendering when filtering is active */}
              {(filter !== 'all' || debouncedSearchTerm || filteredEvents.length <= VISIBLE_THRESHOLD) && (
                <>
                  {filteredEvents.map((event) => (
                    <div key={event._id} className="relative z-10">
                      <EventListItem
                        event={event}
                        onDelete={showActions ? onDelete : undefined}
                        onManage={showActions ? onManage : undefined}
                        onVisibilityControl={showActions ? onVisibilityControl : undefined}
                      />
                    </div>
                  ))}
                </>
              )}
              
              {/* Virtualized rendering only when not filtering */}
              {filter === 'all' && !debouncedSearchTerm && filteredEvents.length > VISIBLE_THRESHOLD && (
                <>
                  {/* Top spacer */}
                  <div style={{ height: startIndex * ITEM_HEIGHT }} />
                  
                  {virtualItems.map((event) => (
                    <div key={event._id} className="relative z-10">
                      <EventListItem
                        event={event}
                        onDelete={showActions ? onDelete : undefined}
                        onManage={showActions ? onManage : undefined}
                        onVisibilityControl={showActions ? onVisibilityControl : undefined}
                      />
                    </div>
                  ))}
                  
                  {/* Bottom spacer */}
                  <div 
                    style={{ 
                      height: Math.max(0, (filteredEvents.length - (startIndex + visibleItemCount)) * ITEM_HEIGHT) 
                    }} 
                  />
                </>
              )}
            </div>
          )}

          {/* For Grid View */}
          {view === 'grid' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredEvents.map((event) => (
                <div key={event._id} className="relative z-10">
                  <EventGrid
                    events={[event]}
                    onDelete={showActions ? onDelete : undefined}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EventList;