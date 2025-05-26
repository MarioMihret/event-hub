"use client";

import { useState, useEffect } from "react";
import { useParams, usePathname } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, MapPin, Users, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { use } from "react";
import React from "react";
import type { Event } from "@/types/event";

// Format date/time in a user-friendly way
const formatEventDateTime = (date: string, includeTime: boolean = true) => {
  const eventDate = new Date(date);
  let options: Intl.DateTimeFormatOptions = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  };
  
  if (includeTime) {
    options = {
      ...options,
      hour: "2-digit",
      minute: "2-digit"
    };
  }
  
  return eventDate.toLocaleDateString(undefined, options);
};

export default function EventLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }> | { id: string };
}) {
  // Unwrap params using React.use() for Next.js 15
  const unwrappedParams = 'then' in params ? React.use(params) : params;
  const eventId = unwrappedParams.id;
  
  const pathname = usePathname();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);

  // Determine current section based on the pathname
  const isPaymentSection = pathname?.includes('/payment') || false;
  const isMainEventPage = pathname === `/events/${eventId}`;
  
  // Skip fetching event data if on the main event page (it fetches its own data)
  // or for other designated sub-routes like success/tickets/receipt.
  const skipLayoutFetch = isMainEventPage || 
                         pathname?.includes('/success') || 
                         pathname?.includes('/tickets') || 
                         pathname?.includes('/receipt') || 
                         false;

  useEffect(() => {
    const fetchEventDetails = async () => {
      if (!eventId || skipLayoutFetch) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/events/${eventId}`);
        // Handle 403 Forbidden (access denied) gracefully
        if (response.status === 403) {
          // console.log("[EventLayout] Access denied to event details via API (status 403)."); // Suppress this log
          setEvent(null); // Ensure event state is null
          setLoading(false);
          return;
        }
        // Handle other errors
        if (!response.ok) {
          console.error("[EventLayout] Failed to fetch event details", response.status, response.statusText);
          setEvent(null); // Ensure event state is null
          setLoading(false);
          return;
        }
        const data = await response.json();
        setEvent(data.event as Event);
      } catch (error) {
        console.error("[EventLayout] Error during fetch operation:", error);
        setEvent(null); // Reset on any fetch error
      } finally {
        setLoading(false);
      }
    };

    fetchEventDetails();
  }, [eventId, skipLayoutFetch]);

  // Show context bar only for specific sub-routes like payment,
  // provided the layout has fetched event data, and it's not the main event page.
  const showContextBar = isPaymentSection && event && !isMainEventPage && !loading;

  return (
    <div className="min-h-screen bg-black py-4">
      {/* Event context bar */}
      {showContextBar && (
        <div className="bg-gray-800/50 py-4 mb-8">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex items-center gap-3">
                <Link href={`/events/${eventId}`} className="text-gray-400 hover:text-white transition-colors">
                  <ArrowLeft className="w-5 h-5" />
                </Link>
                <div>
                  <h2 className="text-lg md:text-xl font-semibold text-white">{event.title}</h2>
                  <div className="flex items-center gap-4 text-sm text-gray-400">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>{formatEventDateTime(event.date, false)}</span>
                    </div>
                    {event.location && (
                      <div className="flex items-center gap-1">
                        {event.isVirtual ? (
                          <span className="flex items-center gap-1">Virtual Event</span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {event.location.city || event.location.address}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {event.maxAttendees && (
                  <div className="flex items-center gap-1 text-sm bg-gray-700/50 px-3 py-1 rounded-full">
                    <Users className="w-4 h-4 text-purple-400" />
                    <span className="text-gray-300">{event.attendees || 0}/{event.maxAttendees}</span>
                  </div>
                )}
                {event.date && (
                  <div className="flex items-center gap-1 text-sm bg-gray-700/50 px-3 py-1 rounded-full">
                    <Clock className="w-4 h-4 text-purple-400" />
                    <span className="text-gray-300">{new Date(event.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        {children}
      </motion.div>
    </div>
  );
} 