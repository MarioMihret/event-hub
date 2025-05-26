"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Filter, Loader, ArrowUp, ArrowDown, Search, Calendar, MapPin, Image as ImageIcon, ChevronRight } from "lucide-react";
import NextImage from "next/image";
import SearchBar from "../userEvent/SearchBar";
import FilterSection from "../userEvent/FilterSection";
import EventCard from "../userEvent/EventCard";
import SkeletonLoader from "../userEvent/SkeletonLoader";
import { useDebounce } from "./hooks/useDebounce";
import type { Event } from "../../types/event";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-hot-toast";
import NoiseBackground from "../../components/ui/NoiseBackground";
import { parseISO, format } from "date-fns";

// NoiseBackground component
// const NoiseBackground = () => { ... }; // Removed the entire local definition

interface EventsResponse {
  events: Event[];
  pagination?: {
    totalItems: number;
    currentPage: number;
    itemsPerPage: number;
    totalPages: number;
  };
}

// Filter options for the new FilterSection component
const filterOptions = {
  categories: [
    { id: 'tech', name: 'Technology' },
    { id: 'business', name: 'Business' },
    { id: 'arts', name: 'Arts' },
    { id: 'sports', name: 'Sports' },
    { id: 'health', name: 'Health' },
    { id: 'education', name: 'Education' },
    { id: 'social', name: 'Social' },
    { id: 'other', name: 'Other' },
  ],
  locations: [
    { id: 'addis-ababa', name: 'Addis Ababa' },
    { id: 'online', name: 'Online' },
    { id: 'other-locations', name: 'Other Locations' },
  ],
  priceRanges: [
    { id: 'free', name: 'Free' },
    { id: 'paid', name: 'Paid' },
    { id: 'under-100', name: 'Under 100 ETB' },
    { id: '100-500', name: '100-500 ETB' },
    { id: 'over-500', name: 'Over 500 ETB' },
  ],
  dates: [
    { id: 'today', name: 'Today' },
    { id: 'tomorrow', name: 'Tomorrow' },
    { id: 'this-week', name: 'This Week' },
    { id: 'this-weekend', name: 'This Weekend' },
    { id: 'next-week', name: 'Next Week' },
    { id: 'next-month', name: 'Next Month' },
  ],
};

// Type for the NEW simplified filters state
type SimpleFiltersState = Record<string, string[]>;

const EventsPage = () => {
  const router = useRouter();
  const { data: session, status: authStatus } = useSession();
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  // Filters state now holds simple arrays from FilterSection directly
  const [filters, setFilters] = useState<SimpleFiltersState>({});
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [sortBy, setSortBy] = useState<'date' | 'price' | 'attendees' | 'created'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [totalEvents, setTotalEvents] = useState<number>(0);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [featuredEvent, setFeaturedEvent] = useState<Event | null>(null);
  
  // Request counter to track API calls
  const requestCount = useRef(0);
  const lastRequestTime = useRef<number>(0);
  const MIN_REQUEST_INTERVAL = 500; // minimum time between requests in ms

  const debouncedSearchQuery = useDebounce(searchQuery, 500);

  // Check URL for 'created' parameter to clear filters
  useEffect(() => {
    // Only run on the client
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const created = urlParams.get('created') === 'true';
      
      if (created) {
        // Clear all filters to ensure newly created event is visible
        setFilters({});
        setSortBy('date');
        setSortOrder('desc');
        setSearchQuery('');
        
        // Remove the created parameter from URL
        urlParams.delete('created');
        const newUrl = window.location.pathname + (urlParams.toString() ? `?${urlParams.toString()}` : '');
        window.history.replaceState({}, '', newUrl);
        
        // Show toast message
        toast.success('Your event was created successfully!');
      }
    }
  }, []);

  // 🔍 Fetch Events Logic (No longer needs useCallback)
  const fetchEventsLogic = async () => {
    // Prevent too frequent API calls
    const now = Date.now();
    if (now - lastRequestTime.current < MIN_REQUEST_INTERVAL) {
      console.log(`[API Throttling] Call skipped - last request was ${now - lastRequestTime.current}ms ago. Min interval: ${MIN_REQUEST_INTERVAL}ms.`);
      return;
    }
    console.log("[API Call] Proceeding with API call.");
    
    // Track request count and time
    requestCount.current += 1;
    const currentRequest = requestCount.current;
    lastRequestTime.current = now;
    
    console.log(`Request #${currentRequest} started for page ${page}`);
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        perPage: "12",
        sortBy,
        sortOrder,
        hideExpired: "true"
      });

      // Add search query if present
      if (debouncedSearchQuery) {
        params.append("search", debouncedSearchQuery);
        console.log(`Search query: "${debouncedSearchQuery}"`);
      }

      // Add filters (now simpler: just join arrays)
      Object.entries(filters).forEach(([key, value]) => {
        // value should always be an array now based on SimpleFiltersState
        if (Array.isArray(value) && value.length > 0) {
          // Backend expects parameters like categories, locations, priceRanges, dates
          // Ensure the keys match what the backend expects (e.g., filter state key 'categories' -> URL param 'categories')
          console.log(`[DEBUG] Appending filter: ${key}=${value.join(',')}`);
          params.append(key, value.join(','));
        }
      });

      const apiUrl = `/api/events?${params.toString()}`;
      console.log('Fetching events from:', apiUrl);
      
      const response = await fetch(apiUrl, {
        headers: { Accept: "application/json" },
        cache: 'no-store'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch events");
      }

      const data: EventsResponse = await response.json();
      console.log(`[API Response] Received ${data.events.length} events. Page: ${page}, Total from pagination: ${data.pagination?.totalItems}`);
      
      const newEvents = data.events;

      console.log("[State Update] Events data before setEvents call:", newEvents);
      setEvents((prev) => {
        const updatedEvents = page === 1 ? newEvents : [...prev, ...newEvents];
        console.log("[State Update] Events after setEvents logic. Prev count:", prev.length, "New/Added count:", newEvents.length, "Resulting count:", updatedEvents.length, "Current Page:", page);
        return updatedEvents;
      });
      setHasMore(data.pagination ? data.pagination.currentPage < data.pagination.totalPages : false);
      setTotalEvents(data.pagination?.totalItems || 0);
    } catch (err) {
      console.error('Error fetching events:', err);
      setError(err instanceof Error ? err.message : "Something went wrong");
      // Reset events on error
      if (page === 1) {
        setEvents([]);
      }
    } finally {
      setIsLoading(false);
      console.log(`Request #${requestCount.current} completed`);
    }
  };

  // 🚀 Fetch events when dependencies change
  useEffect(() => {
    console.log("🔄 Fetching events due to dependency change...");
    let isMounted = true; 
    const controller = new AbortController(); 
    
    // Skip if already loading TO PREVENT CONCURRENT requests for the initial page
    if (isLoading && page === 1 && requestCount.current > 0) { 
      console.log("Skipping redundant fetch for initial page as a fetch is already in progress.");
      return;
    }
    
    const fetchData = async () => {
      try {
        // Check if mounted to prevent state updates after unmount
        if (isMounted) {
          // Call the fetching logic directly
          await fetchEventsLogic();
        }
      } catch (error) {
        if (!(error instanceof DOMException && error.name === 'AbortError')) {
          console.error('Error fetching events:', error);
        }
      }
    };
    
    fetchData();
    
    return () => {
      console.log("🧹 Cleaning up fetchEvents effect");
      isMounted = false;
      controller.abort();
    };
  // Use direct dependencies for fetching
  }, [page, filters, debouncedSearchQuery, sortBy, sortOrder]);

  // Reset to page 1 when search query or filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearchQuery, filters, sortBy, sortOrder]);

  // NEW: Simpler filter handler - directly updates state with FilterSection output
  const handleSimpleFilterChange = (filterType: string, selectedIds: string[]) => {
    console.log(`[DEBUG] Filter changed - Type: ${filterType}, IDs: ${selectedIds}`);
    setFilters(prev => {
      // Check if the new value is different from the old one
      if (JSON.stringify(prev[filterType] || []) !== JSON.stringify(selectedIds)) {
        return { ...prev, [filterType]: selectedIds };
      }
      return prev; // No change
    });
  };

  // 🔄 Handle Sort Changes
  const handleSortChange = (newSortBy: typeof sortBy, newSortOrder: typeof sortOrder) => {
    setPage(1);
    setSortBy(newSortBy);
    setSortOrder(newSortOrder);
  };

  // Function to clear all filters
  const clearAllFilters = useCallback(() => {
    setFilters({});
    setSearchQuery('');
    setSortBy('date');
    setSortOrder('desc');
  }, []);

  // 🧠 Memoize event list rendering for better performance
  const renderEvents = useMemo(() => {
    console.log("[Render] renderEvents triggered. isLoading:", isLoading, "Page:", page, "Actual events state length:", events.length, "IsSearchActive:", isSearchActive, "Query:", debouncedSearchQuery);

    if (isLoading && page === 1) {
      console.log("[Render] Showing Skeletons (initial load).");
      return Array(6).fill(0).map((_, i) => <SkeletonLoader key={i} />);
    }

    // Use the events directly from state, backend handled filtering
    const eventsToDisplay = events;
    console.log("[Render] eventsToDisplay inside renderEvents memo (derived from events state):", eventsToDisplay.length > 0 ? `${eventsToDisplay.length} events` : "Empty");

    if (eventsToDisplay.length > 0) {
      console.log("[Render] Mapping EventCards.");
      return eventsToDisplay.map((event) => (
        <EventCard
          key={event._id}
          event={event}
          isAuthenticated={authStatus === "authenticated"}
        />
      ));
    }

    console.log("[Render] No events to display OR finished mapping. Error state:", error)
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center col-span-full py-12"
      >
        <div className="bg-[#1A0D25]/30 backdrop-blur-sm rounded-xl p-10 border border-[#b967ff]/10 inline-block max-w-lg mx-auto">
          <Search className="w-16 h-16 text-[#b967ff]/30 mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-white mb-3">No events found</h3>
          <p className="text-gray-400 mb-6">
        {isSearchActive 
              ? `No events match your search for "${debouncedSearchQuery}". Try different keywords or filters.` 
              : 'There are no events matching your current filters. Try changing your filter criteria.'}
          </p>
          {(Object.keys(filters).length > 0 || debouncedSearchQuery) && (
            <button
              onClick={clearAllFilters}
              className="px-6 py-3 bg-[#b967ff]/10 hover:bg-[#b967ff]/20 border border-[#b967ff]/30 rounded-lg text-[#b967ff] transition-colors"
            >
              Clear All Filters
            </button>
          )}
        </div>
      </motion.div>
    );
  }, [events, isLoading, page, authStatus, isSearchActive, debouncedSearchQuery, error, filters, clearAllFilters]);

  // In the useEffect that watches for debouncedSearchQuery changes
  useEffect(() => {
    setIsSearchActive(!!debouncedSearchQuery);
    setPage(1);
  }, [debouncedSearchQuery]);

  // Update useEffect to set featured event when events are loaded
  useEffect(() => {
    if (events.length > 0 && !debouncedSearchQuery) {
      // Use the first event as featured event or find a suitable one
      setFeaturedEvent(events[0]);
    } else {
      setFeaturedEvent(null);
    }
  }, [events, debouncedSearchQuery]);
  
  // Add a formatted date helper using date-fns
  const formatEventDate = (dateString: string) => {
    try {
      const date = parseISO(dateString);
      return format(date, 'PPPP');
    } catch (e) {
      return 'Date not available';
    }
  };
  
  const formatEventTime = (dateString: string) => {
    try {
      const date = parseISO(dateString);
      return format(date, 'p');
    } catch (e) {
      return 'Time not available';
    }
  };

  if (authStatus === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black to-[#120a19] flex items-center justify-center font-sans antialiased">
        <div className="text-center">
          <Loader className="w-12 h-12 text-[#b967ff] animate-spin" />
          <p className="text-[#b967ff] mt-4 animate-pulse font-medium tracking-wide">
            Discovering events for you...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-[#120a19] to-black font-sans antialiased relative overflow-hidden">
      <NoiseBackground />
      
      <div className="container mx-auto px-6 py-16">
        {/* 🔥 Header */}
        <motion.header 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col md:flex-row justify-between items-center gap-6 mb-10"
        >
          <div className="pt-16 pb-8">
            <h1 className="text-center text-4xl font-bold text-gray-100 mb-4 tracking-tight">
              Discover Events
            </h1>
            <p className="text-center text-lg text-gray-400 max-w-2xl mx-auto">
              Find amazing events happening near you or online.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
            <SearchBar 
              onSearch={(query) => {
                console.log(`Executing search for: "${query}"`);
                setSearchQuery(query);
                setIsSearchActive(!!query);
                setPage(1);
              }}
            />
          </div>
        </motion.header>

        {/* Featured Event Section */}
        {!isSearchActive && featuredEvent && !debouncedSearchQuery && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="mb-12"
          >
            <div className="flex items-center mb-6">
              <div className="w-1.5 h-8 bg-[#b967ff] rounded mr-3"></div>
              <h2 className="text-2xl font-bold text-white">Featured Event</h2>
              <span className="ml-3 px-2 py-0.5 text-xs bg-[#b967ff]/10 rounded-full text-[#b967ff] font-medium">
                Highlighted
              </span>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 bg-[#120a19]/70 backdrop-blur-md border border-[#b967ff]/20 p-6 rounded-xl shadow-lg overflow-hidden">
              {/* Featured event image */}
              <div className="lg:col-span-1 relative h-72 rounded-lg overflow-hidden">
                {featuredEvent.coverImage?.url ? (
                  <NextImage
                    src={featuredEvent.coverImage.url}
                    alt={featuredEvent.title}
                    fill
                    className="object-cover transition-transform duration-500 hover:scale-105"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-[#1A0D25]">
                    <ImageIcon className="w-16 h-16 text-[#b967ff]/30" />
                  </div>
                )}
                
                {/* Category badge */}
                {featuredEvent.category && (
                  <div className="absolute top-4 left-4 bg-[#b967ff]/90 text-white px-3 py-1 rounded-full text-sm font-medium">
                    {featuredEvent.category}
                  </div>
                )}
              </div>
              
              {/* Featured event details */}
              <div className="lg:col-span-2 flex flex-col h-full">
                <h3 className="text-2xl font-bold text-white mb-2">{featuredEvent.title}</h3>
                <p className="text-gray-300 mb-4 line-clamp-2">{featuredEvent.description}</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-auto">
                  <div className="flex items-center gap-2">
                    <Calendar className="text-[#b967ff] w-5 h-5" />
                    <div>
                      <p className="text-white font-medium">{formatEventDate(featuredEvent.date)}</p>
                      <p className="text-gray-400 text-sm">{formatEventTime(featuredEvent.date)}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <MapPin className="text-[#b967ff] w-5 h-5" />
                    <div>
                      <p className="text-white font-medium">
                        {featuredEvent.isVirtual ? 'Virtual Event' : 
                          featuredEvent.location?.city || 
                          featuredEvent.location?.address || 
                          'Location TBA'}
                      </p>
                      {featuredEvent.isVirtual && <p className="text-gray-400 text-sm">Join online</p>}
                    </div>
                  </div>
                </div>
                
                <div className="mt-6">
                  <button
                    onClick={() => router.push(`/events/${featuredEvent._id}`)}
                    className="px-6 py-3 bg-[#b967ff] hover:bg-[#a145e9] text-white font-medium rounded-lg transition-all duration-300 flex items-center gap-2"
                  >
                    View Details
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </motion.section>
        )}

        {/* 🔢 Result Count */}
        <div className="mb-6 text-gray-300">
          {isSearchActive && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[#120a19]/70 p-4 rounded-xl border border-[#b967ff]/20 mb-6"
            >
              <p className="font-medium text-[#b967ff] mb-1 flex items-center">
                <Search className="w-4 h-4 mr-2" />
                Search results for: "{debouncedSearchQuery}"
              </p>
              {totalEvents > 0 ? (
                <p className="text-gray-300 tracking-wide">
                  Found {events.length} matching events
                  {totalEvents > events.length && ` of ${totalEvents} total`}
                </p>
              ) : !isLoading ? (
                <p className="text-gray-300 tracking-wide">No events found matching your search</p>
              ) : (
                <p className="text-gray-300 tracking-wide">Searching...</p>
              )}
            </motion.div>
          )}
          {!isSearchActive && totalEvents > 0 && (
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-gray-300 font-medium tracking-wide mb-6"
            >
              Showing {events.length} events{totalEvents > events.length ? ` of ${totalEvents} total` : ''}
            </motion.p>
          )}
        </div>

        {/* 🛠 Filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              id="filter-section"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mb-8"
            >
              <FilterSection
                categories={filterOptions.categories}
                locations={filterOptions.locations}
                priceRanges={filterOptions.priceRanges}
                dates={filterOptions.dates}
                onFilterChange={handleSimpleFilterChange}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* 🔄 Sort Options */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-wrap items-center gap-4 mb-8 bg-[#120a19]/50 backdrop-blur-sm rounded-xl p-4 border border-white/5"
        >
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#b967ff]" />
            <label htmlFor="sortBy" className="text-gray-300 font-medium">Sort by:</label>
          </div>
          <select
            id="sortBy"
            value={sortBy}
            onChange={(e) => handleSortChange(e.target.value as typeof sortBy, sortOrder)}
            className="bg-black/30 text-white rounded-lg px-4 py-2 border border-[#b967ff]/20 focus:ring-2 focus:ring-[#b967ff]/50 focus:border-transparent"
          >
            <option value="date">Date</option>
            <option value="price">Price</option>
            <option value="attendees">Attendees</option>
            <option value="created">Created Date</option>
          </select>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleSortChange(sortBy, sortOrder === 'asc' ? 'desc' : 'asc')}
            className="p-2 rounded-lg bg-black/30 border border-[#b967ff]/20 hover:border-[#b967ff]/40 transition flex items-center gap-1 text-white"
            aria-label={sortOrder === 'asc' ? 'Sort descending' : 'Sort ascending'}
            title={sortOrder === 'asc' ? 'Sort descending' : 'Sort ascending'}
          >
            {sortOrder === 'asc' ? 
              <><ArrowUp className="w-4 h-4 text-[#b967ff]" /> <span className="sr-only md:not-sr-only md:inline font-medium">Ascending</span></> : 
              <><ArrowDown className="w-4 h-4 text-[#b967ff]" /> <span className="sr-only md:not-sr-only md:inline font-medium">Descending</span></>}
          </motion.button>
        </motion.div>

        {/* 🧠 Error Handling */}
        {error ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16 bg-red-900/20 backdrop-blur-sm rounded-xl border border-red-500/20 my-8"
          >
            <p className="text-red-400 mb-4 font-medium">{error}</p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setError(null);
                fetchEventsLogic();
              }}
              className="px-6 py-3 bg-[#b967ff] hover:bg-[#b967ff]/90 rounded-xl text-white transition-all focus:ring-2 focus:ring-purple-400 font-medium tracking-wide"
            >
              Retry
            </motion.button>
          </motion.div>
        ) : (
          <>
            {/* Filter Button above Events */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-center mb-8"
            >
              <motion.button
                whileHover={{ scale: 1.05, y: -2, boxShadow: '0 8px 20px rgba(185, 103, 255, 0.3)' }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowFilters((prev) => !prev)}
                className={`px-6 py-3 ${showFilters ? "bg-[#b967ff]" : "bg-[#120a19]"} border ${
                  showFilters ? "border-[#b967ff]" : "border-[#b967ff]/30"
                } rounded-full transition-all duration-300 focus:ring-2 focus:ring-[#b967ff]/50 
                flex items-center gap-3 text-white shadow-lg ${showFilters ? "shadow-[#b967ff]/30" : ""}`}
                aria-expanded={showFilters}
                aria-controls="filter-section"
              >
                <motion.div
                  animate={{ 
                    rotate: showFilters ? [0, 15, 0] : 0,
                  }}
                  transition={{ duration: 0.5 }}
                  className={`p-2 rounded-full ${showFilters ? "bg-white/20" : "bg-[#b967ff]/10"}`}
                >
                  <Filter className={`w-5 h-5 ${showFilters ? "text-white" : "text-[#b967ff]"}`} />
                </motion.div>
                <span className="font-medium tracking-wide">{showFilters ? "Hide Filters" : "Filter Events"}</span>
              </motion.button>
            </motion.div>
            
            {/* 🎟️ Event List */}
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8" role="region" aria-label="Events list">
              {renderEvents}
              {isLoading && page > 1 && (
                <div className="col-span-full flex justify-center py-8">
                  <Loader className="w-8 h-8 text-[#b967ff] animate-spin" />
                </div>
              )}
            </section>

            {/* 📥 Load More */}
            {!isLoading && events.length > 0 && (
              <div className="flex justify-center mt-12">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setPage((prev) => prev + 1)}
                  disabled={isLoading || !hasMore}
                  className={`px-6 py-3 rounded-xl flex items-center gap-2 transition-all focus:ring-2 shadow-lg ${
                    hasMore 
                      ? "bg-[#b967ff] hover:bg-[#b967ff]/90 focus:ring-purple-400 shadow-[#b967ff]/20" 
                      : "bg-gray-800 border border-white/10 cursor-not-allowed"
                  }`}
                  aria-disabled={!hasMore}
                >
                  {isLoading ? (
                    <Loader className="w-5 h-5 animate-spin" />
                  ) : hasMore ? (
                    <span className="font-medium tracking-wide">Load More</span>
                  ) : (
                    <span className="font-medium tracking-wide">No More Events</span>
                  )}
                </motion.button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default EventsPage;
