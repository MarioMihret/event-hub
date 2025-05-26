"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Calendar, MapPin, Tag, Ticket, ArrowRight, ChevronLeft, Info, Download, User, ChevronRight } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { toast } from "react-hot-toast";

const NoiseBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    let animationFrameId: number;
    let noise: ImageData;
    
    // Set canvas to full screen
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      // Create initial noise
      createNoise();
    };
    
    // Create static noise
    const createNoise = () => {
      const idata = ctx.createImageData(canvas.width, canvas.height);
      const buffer32 = new Uint32Array(idata.data.buffer);
      const len = buffer32.length;
      
      for (let i = 0; i < len; i++) {
        // Purple-themed noise
        const alpha = Math.random() * 0.05; // Very subtle transparency
        if (Math.random() < 0.03) { // Occasional bright purple sparkles
          // ABGR format for canvas
          buffer32[i] = (alpha * 255 < 0 ? 0 : alpha * 255 > 255 ? 255 : alpha * 255) << 24 | 
                       (Math.random() * 100) << 16 | 
                       (Math.random() * 50) << 8 | 
                       0xB9; // Hint of bright purple
        } else {
          buffer32[i] = (alpha * 255 < 0 ? 0 : alpha * 255 > 255 ? 255 : alpha * 255) << 24 | 
                       (Math.random() * 30) << 16 | 
                       (Math.random() * 15) << 8 | 
                       0x30;
        }
      }
      
      noise = idata;
    };
    
    // Animate noise
    const renderNoise = () => {
      if (!ctx || !noise) return;
      
      // Apply subtle intensity
      const idata = ctx.createImageData(canvas.width, canvas.height);
      const buffer32 = new Uint32Array(idata.data.buffer);
      const noiseBuffer = new Uint32Array(noise.data.buffer);
      const len = buffer32.length;
      
      for (let i = 0; i < len; i++) {
        if (Math.random() < 0.3) {
          buffer32[i] = noiseBuffer[i];
        } else {
          buffer32[i] = 0;
        }
      }
      
      ctx.putImageData(idata, 0, 0);
      animationFrameId = requestAnimationFrame(renderNoise);
    };
    
    // Initialize
    resize();
    renderNoise();
    window.addEventListener('resize', resize);
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);
  
  return (
    <canvas 
      ref={canvasRef}
      className="fixed top-0 left-0 w-full h-full -z-10 pointer-events-none opacity-20"
    />
  );
};

interface PaymentDetails {
  order_id: string;
  orderId?: string;
  eventId: string;
  eventTitle: string;
  eventDate: string;
  email: string;
  amount: string;
  firstName: string;
  lastName: string;
  phone?: string;
  date: string;
  location?: string | {
    address?: string;
    venue?: string;
    city?: string;
    country?: string;
    coordinates?: {
      lat?: number;
      lng?: number;
    };
  };
  tickets: {
    ticketId: string;
    name: string;
    price: number;
    quantity: number;
  }[];
}

export default function PaymentSuccessPage() {
  const router = useRouter();
  // const params = useParams(); // No longer using useParams for eventId
  // const eventId = params?.id as string; // Old way

  const [eventId, setEventId] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [source, setSource] = useState<string | null>(null); // Optional: capture source like rsvp_virtual

  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingMeeting, setIsFetchingMeeting] = useState(false);
  const [meetingError, setMeetingError] = useState<string | null>(null); // Used for meeting link errors
  const [errorMessage, setErrorMessage] = useState<string | null>(null); // Used for general page errors including order details fetching
  
  // Helper function to format location objects to strings
  const formatLocation = (location: any): string => {
    if (!location) return "Venue TBD";
    
    // If location is already a string, return it
    if (typeof location === 'string') return location;
    
    // If location is an object, extract address or venue
    if (typeof location === 'object') {
      // Try to create a formatted address from the parts
      if (location.address) return location.address;
      if (location.venue) return location.venue;
      
      // If we have city/country but no address
      const cityCountry = [];
      if (location.city) cityCountry.push(location.city);
      if (location.country) cityCountry.push(location.country);
      
      if (cityCountry.length > 0) return cityCountry.join(', ');
    }
    
    // Fallback
    return "Venue location";
  };
  
  useEffect(() => {
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      const currentEventId = searchParams.get("eventId");
      const currentOrderId = searchParams.get("orderId");
      const currentSource = searchParams.get("source");
      const currentEventType = searchParams.get("eventType"); // Add event type detection

      if (!currentOrderId) {
        console.error("PaymentSuccessPage: Order ID is critically missing from URL query parameters.");
        toast.error("Order confirmation details are missing. Redirecting...");
        router.replace("/events"); // Redirect if orderId is missing
        return;
      }
      setOrderId(currentOrderId);

      if (currentEventId) {
        setEventId(currentEventId);
      } else {
        console.warn("PaymentSuccessPage: Event ID is missing from URL query parameters.");
        toast("Event ID is missing, some context may be limited."); // Changed from toast.info
      }
      
      if (currentSource) {
        setSource(currentSource);
      }
      
      // Handle direct redirection if event type is provided
      if (currentEventType && currentOrderId) {
        // Auto-redirect after a short delay to show success page
        const redirectTimer = setTimeout(() => {
          if (currentEventType === 'virtual' && currentEventId) {
            console.log("Auto-redirecting to virtual meeting page");
            router.push(`/payments/meeting?eventId=${currentEventId}&orderId=${currentOrderId}&source=payment_success`);
          } else if (currentEventType === 'location') {
            console.log("Auto-redirecting to ticket page");
            router.push(`/payments/ticket?orderId=${currentOrderId}&source=payment_success`);
          }
        }, 3000); // 3 second delay before auto-redirect
        
        return () => clearTimeout(redirectTimer);
      }
    }
  }, [router]);

  useEffect(() => {
    const fetchOrderDetails = async () => {
      if (!orderId) {
        setIsLoading(false);
        if (!window.location.search) {
          toast.error("Missing order information to display confirmation.");
        }
        return;
      }

      setIsLoading(true);
      setPaymentDetails(null);
      setErrorMessage(null); // Clear general errors
      setMeetingError(null); // Clear specific meeting errors too

      try {
        console.log(`[SuccessPage] Fetching order details for orderId: ${orderId}, eventId: ${eventId || 'not provided'}`);
        const apiUrl = `/api/orders/details?orderId=${orderId}`;
        console.log(`[SuccessPage] API URL: ${apiUrl}`);
        
        const startTime = Date.now();
        const response = await fetch(apiUrl);
        const responseTime = Date.now() - startTime;
        console.log(`[SuccessPage] API response received in ${responseTime}ms. Status: ${response.status}`);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `Failed to fetch order details: ${response.statusText}`);
        }
        
        const details = await response.json();
        console.log(`[SuccessPage] Order details received:`, details);
        
        if (eventId && details.eventId && details.eventId !== eventId) {
          console.warn(`[SuccessPage] Order details fetched for order ${orderId}, but eventId mismatch. URL: ${eventId}, Fetched: ${details.eventId}`);
          setEventId(details.eventId);
        }
        
        // Sanitize location if it's an object before setting to state
        const sanitizedDetails = {...details};
        if (details.location && typeof details.location === 'object') {
          console.log(`[SuccessPage] Converting location object to string`);
          sanitizedDetails.location = formatLocation(details.location);
        }
        
        setPaymentDetails(sanitizedDetails as PaymentDetails);
        
        // Store the event type information for later use
        if (typeof details.isVirtual === 'boolean') {
          console.log(`[SuccessPage] Setting event_is_virtual to ${details.isVirtual}`);
          localStorage.setItem("event_is_virtual", details.isVirtual ? "true" : "false");
        }

      } catch (error: any) {
        console.error("[SuccessPage] Error loading payment/order details:", error);
        setErrorMessage(error.message || "Could not load your order confirmation."); // Set general error message
        toast.error(error.message || "Failed to load confirmation details.");
        setPaymentDetails(null);
      } finally {
        setIsLoading(false);
      }
    };
    
    if (orderId) {
      fetchOrderDetails();
    }
  }, [orderId, eventId]); // Removed router from here as it's not directly used by fetchOrderDetails
  
  // Format date
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return "Date unavailable";
    }
  };
  
  // Format currency
  const formatCurrency = (amount: string | number) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'ETB'
    }).format(numAmount);
  };
  
  // Calculate total ticket count
  const calculateTicketCount = () => {
    if (!paymentDetails?.tickets) return 0;
    
    return paymentDetails.tickets.reduce((total, ticket) => {
      return total + ticket.quantity;
    }, 0);
  };
  
  // Calculate total amount
  const calculateTotal = () => {
    if (!paymentDetails?.tickets) return 0;
    
    return paymentDetails.tickets.reduce((total, ticket) => {
      return total + (ticket.price * ticket.quantity);
    }, 0);
  };
  
  // Store payment data but don't redirect automatically
  useEffect(() => {
    // Store the event info for the meeting page when needed
    if (paymentDetails?.eventId) {
      try {
        // Create a copy of payment details with formatted location to prevent React errors
        const sanitizedDetails = {...paymentDetails};
        
        // Format location if it's an object
        if (paymentDetails.location && typeof paymentDetails.location === 'object') {
          sanitizedDetails.location = formatLocation(paymentDetails.location);
        }
        
        localStorage.setItem("payment_details", JSON.stringify(sanitizedDetails));
      } catch (error) {
        console.error("Error storing payment details:", error);
      }
    }
    
    // Cleanup function to run when component unmounts
    return () => {
      // Don't remove payment details here since we need them for the EventDetails page to check payment status
    };
  }, [paymentDetails]);
  
  // Handle navigation to meeting page
  const navigateToMeeting = () => {
    // First try to get values from URL params, then fall back to paymentDetails
    const finalEventId = eventId || paymentDetails?.eventId;
    const finalOrderId = orderId || paymentDetails?.orderId || paymentDetails?.order_id;
    
    // Check for mock data or invalid ObjectIDs
    const isMockEventId = finalEventId === 'mockEvent123';
    const isRealEventId = 
      finalEventId === '682a4ebd6e29941314d159d2' || 
      finalEventId === '682a483a6e29941314d159cf';
      
    const isValidObjectId = (id) => {
      // Simple ObjectId validation pattern (24 hex chars) or our known real event IDs
      return /^[0-9a-fA-F]{24}$/.test(id) || 
             id === '682a4ebd6e29941314d159d2' || 
             id === '682a483a6e29941314d159cf';
    };
    
    if (isMockEventId || (!isRealEventId && !isValidObjectId(finalEventId))) {
      console.error(`Cannot proceed: Invalid EventID format: ${finalEventId}`);
      setMeetingError("This appears to be test data and cannot be used to access a meeting or ticket. Please use a real event registration.");
      setIsFetchingMeeting(false);
      return;
    }
    
    if (!finalOrderId) {
      console.error("Cannot proceed: Order ID is missing");
      setMeetingError("Cannot proceed: Order ID is missing. Please contact support.");
      setIsFetchingMeeting(false);
      return;
    }
    
    if (finalEventId && finalOrderId) {
      // Check if this is a location-based event (non-virtual)
      const isLocationEvent = localStorage.getItem("event_is_virtual") !== "true";
      const urlParams = new URLSearchParams(window.location.search);
      const eventTypeFromUrl = urlParams.get("eventType");
      
      if (isLocationEvent || eventTypeFromUrl === "location") {
        // For location events, go directly to the ticket page without fetching meeting details
        console.log("Location event detected, redirecting to ticket page");
        router.push(`/payments/ticket?orderId=${encodeURIComponent(finalOrderId)}`);
        return;
      }
      
      // Only proceed with this meeting logic for virtual events
      setIsFetchingMeeting(true);
      setMeetingError(null); // Clear previous errors
      
      const fetchMeetingDetails = async () => {
        try {
          // Fetch event details to get the meeting link
          console.log(`Fetching event details for ${finalEventId}`);
          const response = await fetch(`/api/events/${encodeURIComponent(finalEventId)}`); 
          
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `Failed to fetch event details: ${response.statusText}`);
          }
          const data = await response.json();
          console.log("API response for event details:", data);
          
          const eventFromServer = data.event;

          const isVirtual = eventFromServer?.isVirtual === true;
          localStorage.setItem("event_is_virtual", isVirtual ? "true" : "false");
          
          if (isVirtual) {
            if (eventFromServer?.meetingLink && eventFromServer.meetingLink !== "https://example.com/meeting") {
              console.log("Valid JaaS meeting link found:", eventFromServer.meetingLink);
              localStorage.setItem("meeting_link", eventFromServer.meetingLink);
              localStorage.setItem("meeting_platform", eventFromServer.streamingPlatform || 'JaaS');
            } else {
              console.error("JaaS meeting link is missing for this virtual event.");
              setMeetingError("The meeting link for this virtual event is currently unavailable. Please check back later or contact support.");
              localStorage.removeItem("meeting_link");
              localStorage.setItem("meeting_platform", "Error");
            }
          } else {
            localStorage.removeItem("meeting_link");
            localStorage.removeItem("meeting_platform");
          }
          
          // Properly encode parameters in the URL
          const meetingUrl = `/payments/meeting?eventId=${encodeURIComponent(finalEventId)}&orderId=${encodeURIComponent(finalOrderId)}&source=payment`;
          router.push(meetingUrl);

        } catch (err: any) {
          console.error("Error fetching or processing meeting details:", err);
          setMeetingError(err.message || "Could not load meeting information. Please try again.");
          // Still navigate, /payments/meeting will handle its own error display based on its fetch
          const meetingUrl = `/payments/meeting?eventId=${encodeURIComponent(finalEventId)}&orderId=${encodeURIComponent(finalOrderId)}&source=payment`;
          router.push(meetingUrl);
        } finally {
          setIsFetchingMeeting(false);
        }
      };
      
      fetchMeetingDetails();
    } else {
      // This case should ideally not be hit if the page loaded correctly with eventId and orderId from URL
      console.error("Cannot proceed: Event ID or Order ID is missing.");
      setMeetingError("Cannot proceed: Essential information (Event ID or Order ID) is missing from the page URL. Please check the link or contact support.");
      setIsFetchingMeeting(false); // Ensure loading state is reset
    }
  };
  
  // Navigate back to event details
  const navigateToEvent = () => {
    if (paymentDetails?.eventId) {
      try {
        // Format location to ensure it's a string before storing
        const locationString = paymentDetails.location ? formatLocation(paymentDetails.location) : "Venue location";
        
        // Store all relevant data in localStorage for ticket generation
        const ticketData = {
          eventId: paymentDetails.eventId,
          eventTitle: paymentDetails.eventTitle,
          eventDate: paymentDetails.eventDate,
          firstName: paymentDetails.firstName,
          lastName: paymentDetails.lastName,
          email: paymentDetails.email,
          tickets: paymentDetails.tickets,
          location: locationString, // Add formatted location
          order_id: paymentDetails.orderId || paymentDetails.order_id
        };
        
        localStorage.setItem("payment_details", JSON.stringify(ticketData));
        localStorage.setItem("order_id", paymentDetails.orderId || paymentDetails.order_id);
        localStorage.setItem("event_id", paymentDetails.eventId);
        
        console.log("Stored ticket data in localStorage:", ticketData);
        
        // Check the source parameter or localStorage to determine event type
        const isLocationEvent = source?.includes('location') || localStorage.getItem("event_is_virtual") !== "true";
        
        if (isLocationEvent) {
          // For physical/location events, always go directly to ticket page
          console.log("Redirecting to ticket page for location event");
          const orderId = paymentDetails.orderId || paymentDetails.order_id;
          router.push(`/payments/ticket?orderId=${encodeURIComponent(orderId)}`);
        } else {
          // For virtual events, go to meeting page directly
          console.log("Redirecting to meeting page for virtual event");
          const orderId = paymentDetails.orderId || paymentDetails.order_id;
          const meetingUrl = `/payments/meeting?eventId=${encodeURIComponent(paymentDetails.eventId)}&orderId=${encodeURIComponent(orderId)}&source=payment`;
          router.push(meetingUrl);
        }
      } catch (error) {
        console.error("Error preparing ticket data:", error);
        toast.error("Error preparing ticket information.");
        router.push(`/events/${encodeURIComponent(paymentDetails.eventId)}`);
      }
    } else {
      router.push('/events');
    }
  };
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black to-[#120a19] flex items-center justify-center font-sans antialiased">
        <NoiseBackground />
        <div className="flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-[#b967ff] border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }
  
  if (!paymentDetails) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black to-[#120a19] flex items-center justify-center font-sans antialiased">
        <NoiseBackground />
        <div className="text-center p-8 max-w-md bg-[#120a19]/70 backdrop-blur-sm border border-[#b967ff]/20 rounded-xl shadow-xl">
          <h2 className="text-2xl font-bold text-white mb-4">Payment Information Not Found</h2>
          <p className="text-gray-300 mb-6">We couldn't find your payment details. Please check your order history or contact support.</p>
          <Link 
            href={`/events/${eventId}`}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#b967ff] text-white rounded-lg hover:bg-[#b967ff]/90 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Return to Event</span>
          </Link>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-[#120a19] to-black font-sans antialiased">
      <NoiseBackground />
      
      <div className="container mx-auto px-4 py-12">
        {/* Back navigation */}
        <div className="mb-8">
          <Link 
            href={`/events/${eventId}`}
            className="inline-flex items-center gap-2 text-[#b967ff] hover:text-[#b967ff]/80 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back to Event Details</span>
          </Link>
        </div>
        
        {/* Success message */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-[#120a19]/70 backdrop-blur-sm border border-[#b967ff]/20 rounded-xl p-8 shadow-xl mb-8"
        >
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="w-20 h-20 mx-auto bg-gradient-to-r from-[#b967ff] to-purple-400 rounded-full flex items-center justify-center mb-6"
            >
              <Check className="w-10 h-10 text-white" />
            </motion.div>
            
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mt-4">Payment Successful!</h1>
            <p className="text-gray-300 mt-2 text-sm sm:text-base">
              Thank you for your order, {paymentDetails.firstName}. Your event details are below.
            </p>
          </div>
          
          {/* Insert Meeting Error Display Here */}
          {meetingError && !isFetchingMeeting && (
            <div className="bg-red-900 bg-opacity-70 border border-red-700 text-red-200 p-3 rounded-md mb-4 text-sm flex items-center shadow-lg">
              <Info className="w-5 h-5 mr-3 flex-shrink-0" />
              <span>{meetingError}</span>
            </div>
          )}
          
          {/* Event details */}
          <div className="bg-[#1A0D25] border border-[#b967ff]/30 rounded-lg p-6 mb-8">
            <h3 className="text-white font-semibold text-lg mb-4">Event Details</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-300 mb-6">
              <div className="flex items-start gap-2">
                <Tag className="w-4 h-4 text-[#b967ff] mt-1 flex-shrink-0" />
                <div>
                  <p className="text-gray-400 text-sm">Event</p>
                  <p className="text-white">{paymentDetails.eventTitle}</p>
                </div>
              </div>
              
              <div className="flex items-start gap-2">
                <Calendar className="w-4 h-4 text-[#b967ff] mt-1 flex-shrink-0" />
                <div>
                  <p className="text-gray-400 text-sm">Date</p>
                  <p className="text-white">{formatDate(paymentDetails.eventDate)}</p>
                </div>
              </div>
            </div>
            
            <h3 className="text-white font-semibold text-lg mb-4">Order Summary</h3>
            
            <div className="flex justify-between items-center mb-4">
              <span className="text-gray-400">Order ID:</span>
              <span className="text-white font-medium">{paymentDetails.order_id}</span>
            </div>
            
            <div className="divide-y divide-[#b967ff]/10">
              {paymentDetails.tickets.map((ticket, index) => (
                <div key={index} className="flex justify-between items-center mb-2">
                  <div>
                    <span className="text-white">{ticket.name}</span>
                    <p className="text-gray-400 text-sm">Qty: {ticket.quantity} {ticket.quantity > 1 ? 'tickets' : 'ticket'}</p>
                  </div>
                  <span className="text-white">{formatCurrency(ticket.price * ticket.quantity)}</span>
                </div>
              ))}
              
              <div className="py-3 flex justify-between font-bold">
                <span className="text-white">Total</span>
                <span className="text-[#b967ff]">{formatCurrency(paymentDetails.amount)}</span>
              </div>
            </div>
          </div>
          
          {/* Customer details */}
          <div className="bg-[#1A0D25] border border-[#b967ff]/30 rounded-lg p-6 mb-8">
            <h3 className="text-white font-semibold text-lg mb-4">Customer Details</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-300">
              <div className="flex items-start gap-2">
                <User className="w-4 h-4 text-[#b967ff] mt-1 flex-shrink-0" />
                <div>
                  <p className="text-gray-400 text-sm">Name</p>
                  <p className="text-white">{paymentDetails.firstName} {paymentDetails.lastName}</p>
                </div>
              </div>
              
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-[#b967ff] mt-1 flex-shrink-0" />
                <div>
                  <p className="text-gray-400 text-sm">Email</p>
                  <p className="text-white">{paymentDetails.email}</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-black/30 border border-[#b967ff]/20 rounded-lg p-4 mb-8">
            <div className="flex items-start gap-2 text-gray-300">
              <Info className="w-5 h-5 text-[#b967ff] flex-shrink-0 mt-0.5" />
              <p className="text-sm">
                Your ticket confirmation has been sent to <strong className="text-white">{paymentDetails.email}</strong>. 
                Please keep this email safe as it contains your ticket QR code for entry.
              </p>
            </div>
          </div>
          
          {/* Action buttons */}
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={navigateToEvent}
              className="flex-1 px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg text-white text-center transition-colors duration-150 flex items-center justify-center gap-2"
              disabled={isFetchingMeeting}
            >
              <ChevronLeft className="w-5 h-5" />
              Back to Event Details
            </button>
            <button
              onClick={navigateToMeeting}
              disabled={isFetchingMeeting}
              className={`w-full py-3.5 rounded-lg font-medium mt-4 ${
                isFetchingMeeting ? "bg-gray-700 text-gray-400" : "bg-[#b967ff] hover:bg-[#a43dff] text-white"
              } transition-colors flex items-center justify-center gap-2`}
            >
              {isFetchingMeeting ? (
                <>
                  <div className="h-5 w-5 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
                  Loading...
                </>
              ) : (
                <>
                  <ArrowRight size={18} />
                  {(source?.includes('location') || localStorage.getItem("event_is_virtual") !== "true") 
                    ? `View My ${calculateTicketCount() > 1 ? 'Tickets' : 'Ticket'}`
                    : "Join Virtual Meeting"}
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
} 