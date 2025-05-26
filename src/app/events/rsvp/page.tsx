"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ArrowLeft, Send, Calendar, Mail, User, Phone, CheckCircle, Loader, Ticket, ChevronRight } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { toast } from 'react-hot-toast';
import NoiseBackground from "@/components/ui/NoiseBackground";
import type { Event, EventTicket } from "@/types/event";

export default function RSVPPage() {
  const router = useRouter();
  const { data: session, status: authStatus } = useSession();
  const [isLoading, setIsLoading] = useState(true);
  const [eventId, setEventId] = useState<string | null>(null);
  const [event, setEvent] = useState<Event | null>(null);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Form data
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    quantity: 1 // Add default quantity
  });

  // Get eventId from query params & handle auth redirect
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const id = searchParams.get('eventId');
      if (id) {
        setEventId(id);
      } else {
        toast.error("Event ID is missing.");
        router.push('/events');
        return;
      }

      // Handle authentication status
      if (authStatus === 'unauthenticated') {
        toast("Please sign in to RSVP.");
        const callbackUrl = `/events/rsvp?eventId=${id}`;
        router.push(`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
      } else if (authStatus === 'authenticated' && session?.user) {
        // Pre-fill form if authenticated and data is available
        setFormData(prev => ({
          ...prev,
          email: session.user.email || "",
          // Assuming name is a single string like "FirstName LastName"
          // Adjust if your session.user.name has a different structure
          firstName: session.user.name?.split(' ')[0] || "",
          lastName: session.user.name?.split(' ').slice(1).join(' ') || "",
        }));
      }
    }
  }, [router, authStatus, session]);

  // Fetch event data - ensure this only runs if eventId is set and user is not being redirected
  useEffect(() => {
    const fetchEventData = async () => {
      if (!eventId || authStatus === 'unauthenticated' || authStatus === 'loading') {
        // Do not fetch if no eventId, or if auth is still loading or user is unauthenticated (will be redirected)
        if (!eventId && authStatus !== 'loading') setIsLoading(false); // Stop loading if eventId is the issue
        return;
      }
      
      // User is authenticated or auth status is determined, and eventId is present
      setIsLoading(true);
      try {
        // Correctly fetch event data using the API endpoint
        const response = await fetch(`/api/events/${eventId}`);
        
        if (!response.ok) {
          // Try to parse error from response, otherwise use status text
          let errorMsg = response.statusText;
          try {
            const errorData = await response.json();
            errorMsg = errorData.error || errorData.message || errorMsg;
          } catch (e) { /* ignore parsing error */ }
          throw new Error(`Failed to fetch event: ${errorMsg}`);
        }
        
        const data = await response.json();
        // The API at /api/events/:id should return an object with an 'event' property
        // or be the event object directly. Adjust based on actual API response structure.
        // Assuming data contains the event object directly or data.event is the event object.
        const eventDetail = data.event || data; 

        if (!eventDetail || !eventDetail._id) {
            throw new Error('Event data is invalid or missing.');
        }

        setEvent(eventDetail as Event);
        
        // Determine if the event is free
        const isFreeEvent = 
          eventDetail.price === 0 || 
          (eventDetail.tickets && eventDetail.tickets.length > 0 && eventDetail.tickets.every((t: EventTicket) => t.price === 0));
          
        // If the event is NOT free, redirect to full ticketing (payments page)
        if (!isFreeEvent) {
          toast.error("This event requires payment. Redirecting to ticketing..."); 
          router.push(`/payments?eventId=${eventId}`);
          return; 
        }

      } catch (error: any) {
        console.error("Error fetching event in RSVP page:", error);
        toast.error(error.message || "Could not load event details.");
        // Optionally redirect if event loading fails critically
        // router.push("/events"); 
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchEventData();
  }, [eventId, router, authStatus]);

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Format date
  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric'
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Submit RSVP
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (authStatus !== 'authenticated') {
      toast.error("You must be signed in to RSVP.");
      // Optionally redirect again, though the effect above should handle it.
      // router.push(`/auth/signin?callbackUrl=${encodeURIComponent(window.location.href)}`);
      return;
    }
    if (!eventId || !event) {
      toast.error("Event details are not loaded yet.");
      return;
    }

    if (!formData.firstName || !formData.lastName || !formData.email) {
      setSubmitError("Please fill in all required fields (First Name, Last Name, Email).");
      toast.error("Please fill in all required fields.");
      return;
    }

    if (typeof event.isVirtual !== 'boolean') {
      toast.error("Cannot determine event type (virtual/physical). Event data may be incomplete.");
      setIsLoading(false);
      setSubmitError("Event data is incomplete. Cannot process RSVP.");
      return;
    }

    setIsLoading(true); 
    setSubmitError(null);

    // Determine orderType based on event.isVirtual
    const orderType = event.isVirtual ? "FREE_VIRTUAL_EVENT_RSVP" : "FREE_LOCATION_EVENT_RSVP";

    try {
      const rsvpPayload = {
        eventId: eventId,
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone || undefined, // Send undefined if empty, API handles optional field
        orderType: orderType, // Add the determined orderType
        quantity: !event.isVirtual ? parseInt(formData.quantity.toString()) || 1 : 1 // Only send quantity for location events
      };
      
      console.log("Sending RSVP payload:", rsvpPayload); // Log the payload

      const response = await fetch('/api/orders/rsvp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(rsvpPayload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || result.message || 'Failed to submit RSVP');
      }

      // RSVP successful, now prepare for success page redirection
      toast.success('RSVP Confirmed!');
      setFormSubmitted(true);

      // Use the orderId directly from the API response for redirection
      const orderId = result.orderId; 
      if (!orderId) {
        // Handle case where API didn't return an orderId unexpectedly
        throw new Error("RSVP successful, but order confirmation ID was missing from response.");
      }

      // For free location-based events, we need to pass the eventId to generate a ticket
      // For virtual events, the success page will fetch the meeting link
      const redirectParams = new URLSearchParams({
        orderId: orderId,
        eventId: eventId,
        source: 'rsvp_' + (event.isVirtual ? 'virtual' : 'location'),
      }).toString();
      
      // Store event type for the success page to know whether to show ticket or meeting link
      localStorage.setItem("event_is_virtual", event.isVirtual ? "true" : "false");
      
      console.log(`RSVP successful. Redirecting to success page with params: ${redirectParams}`);
      
      // Redirect to the success page with all necessary parameters
      router.push(`/payments/success?${redirectParams}`);

    } catch (error: any) {
      console.error("Error submitting RSVP:", error);
      setSubmitError(error.message || "An error occurred during RSVP.");
      toast.error(error.message || "Failed to submit RSVP.");
    } finally {
      setIsLoading(false); // Hide loading state
    }
  };

  if (isLoading || authStatus === 'loading') {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="flex flex-col items-center">
          <Loader className="w-10 h-10 text-purple-500 animate-spin mb-4" />
          <p className="text-gray-400">Loading event details...</p>
        </div>
        <NoiseBackground />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto p-4 max-w-4xl">
        <div className="mb-6">
          <Link 
            href={`/events/${eventId}`} 
            className="inline-flex items-center text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Event
          </Link>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Event details column */}
          <div className="lg:col-span-2">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="bg-[#1A0D25]/40 backdrop-blur-sm p-6 rounded-xl border border-[#b967ff]/20 sticky top-4"
            >
              <h2 className="text-2xl font-bold mb-4">{event?.title}</h2>
              
              <div className="space-y-4 text-gray-300">
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-[#b967ff] mt-0.5" />
                  <div>
                    <p className="font-medium text-white">Date & Time</p>
                    <p className="text-sm">{event?.date ? formatDate(event.date) : "Date not specified"}</p>
                  </div>
                </div>
                
                {event?.shortDescription && (
                  <p className="text-sm border-t border-[#b967ff]/10 pt-4 mt-2">
                    {event.shortDescription}
                  </p>
                )}
                
                <div className="bg-[#2D1D3A] p-3 rounded-lg text-center">
                  <p className="text-[#b967ff] font-medium">
                    {event?.isVirtual ? "Free Virtual Event" : "Free Location Event"}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">Simple RSVP - No payment required</p>
                </div>
              </div>
            </motion.div>
          </div>
          
          {/* RSVP Form column */}
          <div className="lg:col-span-3">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="bg-[#1A0D25]/40 backdrop-blur-sm p-6 rounded-xl border border-[#b967ff]/20"
            >
              <h2 className="text-2xl font-bold mb-6">RSVP for this Event</h2>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-300 mb-2 text-sm">First Name*</label>
                    <div className="relative">
                      <User className="w-5 h-5 text-gray-500 absolute left-3 top-1/2 transform -translate-y-1/2" />
                      <input 
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        required
                        className="w-full bg-[#2D1D3A]/80 border border-[#b967ff]/30 rounded-lg py-3 px-10 text-white focus:outline-none focus:border-[#b967ff]"
                        placeholder="Your first name"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-gray-300 mb-2 text-sm">Last Name</label>
                    <div className="relative">
                      <User className="w-5 h-5 text-gray-500 absolute left-3 top-1/2 transform -translate-y-1/2" />
                      <input 
                        type="text"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        className="w-full bg-[#2D1D3A]/80 border border-[#b967ff]/30 rounded-lg py-3 px-10 text-white focus:outline-none focus:border-[#b967ff]"
                        placeholder="Your last name"
                      />
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="block text-gray-300 mb-2 text-sm">Email Address*</label>
                  <div className="relative">
                    <Mail className="w-5 h-5 text-gray-500 absolute left-3 top-1/2 transform -translate-y-1/2" />
                    <input 
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      className="w-full bg-[#2D1D3A]/80 border border-[#b967ff]/30 rounded-lg py-3 px-10 text-white focus:outline-none focus:border-[#b967ff]"
                      placeholder="Your email address"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-gray-300 mb-2 text-sm">Phone Number</label>
                  <div className="relative">
                    <Phone className="w-5 h-5 text-gray-500 absolute left-3 top-1/2 transform -translate-y-1/2" />
                    <input 
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="w-full bg-[#2D1D3A]/80 border border-[#b967ff]/30 rounded-lg py-3 px-10 text-white focus:outline-none focus:border-[#b967ff]"
                      placeholder="Your phone number"
                    />
                  </div>
                </div>
                
                {/* Add quantity selector for location-based events */}
                {event && !event.isVirtual && (
                  <div>
                    <label className="block text-gray-300 mb-2 text-sm">Number of Tickets</label>
                    <div className="relative">
                      <Ticket className="w-5 h-5 text-gray-500 absolute left-3 top-1/2 transform -translate-y-1/2" />
                      <select
                        name="quantity"
                        value={formData.quantity}
                        onChange={handleInputChange}
                        className="w-full bg-[#2D1D3A]/80 border border-[#b967ff]/30 rounded-lg py-3 px-10 text-white focus:outline-none focus:border-[#b967ff] appearance-none"
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                          <option key={num} value={num}>{num} {num === 1 ? 'ticket' : 'tickets'}</option>
                        ))}
                      </select>
                      <ChevronRight className="w-5 h-5 text-gray-500 absolute right-3 top-1/2 transform -translate-y-1/2 rotate-90" />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">You can request up to 10 tickets per registration</p>
                  </div>
                )}
                
                {submitError && (
                  <div className="bg-red-500/20 border border-red-500/30 text-red-200 p-3 rounded-lg text-sm">
                    {submitError}
                  </div>
                )}
                
                <button 
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-[#b967ff] hover:bg-[#a43dff] text-white py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      Confirm RSVP
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          </div>
        </div>
      </div>
      <NoiseBackground />
    </div>
  );
} 