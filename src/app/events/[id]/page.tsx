import React from "react";
import { notFound, redirect } from "next/navigation";
import EventDetails from "@/components/events/EventDetails";
import { Suspense, cache } from "react";
import { ArrowLeft, AlertTriangle, Loader, Lock } from "lucide-react";
import Link from "next/link";
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { eventService } from '@/lib/services/eventService';
import { ObjectId } from "mongodb";

// Define the Event type just for this component
import {
  Event
  // CreateEventInput, // Removed
  // UpdateEventInput, // Removed
  // EventVisibilityType // Removed, as it's not directly used here, event object has it.
} from "@/types/event";

// Interface for visibility (might need adjustment based on actual type)
// interface EventVisibilityObject { // Removed
//   status?: string;
//   restrictedTo?: string[];
// }

// Loading component
function EventPageLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-black to-[#120a19] flex flex-col items-center justify-center">
      <div className="relative flex flex-col items-center">
        <div className="w-24 h-24 relative mb-8">
          <div className="absolute inset-0 rounded-full border-4 border-[#b967ff]/10 animate-pulse"></div>
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#b967ff] border-r-[#b967ff]/40 animate-spin"></div>
          <Loader className="w-12 h-12 text-[#b967ff] absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 animate-pulse" />
        </div>
        <div className="space-y-3 w-64">
          <div className="h-8 bg-gradient-to-r from-[#1A0D25] to-[#1A0D25]/60 rounded-lg animate-pulse"></div>
          <div className="h-4 bg-gradient-to-r from-[#1A0D25] to-[#1A0D25]/60 rounded w-3/4 animate-pulse"></div>
          <div className="h-4 bg-gradient-to-r from-[#1A0D25] to-[#1A0D25]/60 rounded w-1/2 animate-pulse"></div>
        </div>
      </div>
    </div>
  );
}

// Error component - Modified to remove ScheduledAccessError handling
function EventError({ error }: { error: Error }) {
  let title = "Unable to load event";
  let message = error.message || "An unexpected error occurred";
  let icon = <AlertTriangle className="w-8 h-8 text-red-400" />;
  let iconBg = "bg-red-900/20";

  // Customize message and icon for specific errors
  if (error.message.startsWith("Access Denied:")) {
    title = "Access Denied";
    message = error.message.replace("Access Denied: ", ""); // Cleaner message
    icon = <Lock className="w-8 h-8 text-yellow-400" />;
    iconBg = "bg-yellow-900/20";
  } else if (error.message === "Event not found or access denied.") { // Handle specific not found message
    title = "Event Not Found";
    message = "The event you are looking for either does not exist or you do not have permission to view it.";
    icon = <AlertTriangle className="w-8 h-8 text-yellow-400" />; // Or a different icon
    iconBg = "bg-yellow-900/20";
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black to-[#120a19] flex flex-col items-center justify-center text-white p-6">
      <div className="w-full max-w-md bg-[#1A0D25]/40 backdrop-blur-sm border border-[#b967ff]/20 rounded-xl p-8 shadow-[0_8px_30px_rgba(185,103,255,0.1)]">
        <div className="flex flex-col items-center text-center">
          {/* Use dynamic icon and background */}
          <div className={`w-16 h-16 ${iconBg} rounded-full flex items-center justify-center mb-4`}>
            {icon}
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">{title}</h2>
          <p className="text-gray-300 mb-6">{message}</p>
          <Link 
            href="/events" 
            className="px-6 py-3 bg-[#2e1841] hover:bg-[#3e2254] border border-[#b967ff]/30 rounded-lg transition-all flex items-center gap-2 hover:gap-3"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Return to Events</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

// Server component to fetch and display event details
export default async function EventPage({ params }: { params: Promise<{ id: string }> | { id: string } }) {
  const resolvedParams = await params;
  const { id } = resolvedParams;
  
  if (!ObjectId.isValid(id)) {
    notFound();
    return null;
  }
  
  let eventDetailsElement;
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    const userEmail = session?.user?.email;

    // Use the cached function
    const eventData = await getEventDataCached(id, userId, userEmail);
    
    if (!eventData) {
      console.log(`[EventPage] Event not found or access denied (from cache or service) for ID: ${id}. UserID: ${userId}, UserEmail: ${userEmail}`);
      notFound();
      return null;
    }
    
    const event = eventData as Event & { isOwner?: boolean; isRegistered?: boolean }; 
    const isOwner = !!event.isOwner;
    
    console.log(`DEBUG (Page Inlined) - Event: ${event.title}, Session User ID: ${userId || 'undefined'}, User Email: ${userEmail || 'undefined'}, Is Owner: ${isOwner}, Is Registered: ${!!event.isRegistered}`);
    console.log("DEBUG (Page Inlined) - Access granted. Rendering event details.");
    
    const eventDetailsProps = {
      event: event,
    };
    eventDetailsElement = <EventDetails {...eventDetailsProps} />;

  } catch (error: unknown) {
    console.error("[EventPage Inlined] Unexpected error caught:", error);
    const errorToRender = error instanceof Error ? error : new Error("Failed to load event details due to an unexpected issue.");
    eventDetailsElement = <EventError error={errorToRender} />;
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-black to-[#120a19] w-full overflow-x-hidden">
      <Suspense fallback={<EventPageLoading />}>
        {eventDetailsElement}
      </Suspense>
    </main>
  );
}

// Cached function for fetching event data
const getEventDataCached = cache(async (id: string, userId?: string | null, userEmail?: string | null) => {
  console.log(`[React.cache] Calling eventService.getEventById for ID: ${id}, UserID: ${userId}, UserEmail: ${userEmail}`);
  return eventService.getEventById(id, undefined, false, userId, userEmail);
});

// EventPageContent component is no longer used directly by EventPage
// It can be removed or kept if used elsewhere.
// async function EventPageContent({ id }: { id: string }) { /* ... */ }

// Static generation params (if used, might need adjustment)
// export async function generateStaticParams() { /* ... */ }