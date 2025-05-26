"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { CalendarIcon, Tag, MapPin, ChevronLeft, Plus, Minus, CreditCard, Info, Loader, XCircle, User, Mail, Phone } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { toast } from "react-hot-toast";
import type { Event, EventTicket } from "@/types/event";
import NoiseBackground from "@/components/ui/NoiseBackground";

// Color scheme constants (can be moved to a shared file if used elsewhere)
const PURPLE_GRADIENT = "bg-gradient-to-br from-[#b967ff] to-[#7d4bff]";
const BORDER_ACCENT = "border-[#b967ff]/20";
const TEXT_ACCENT = "text-[#b967ff]";
const BG_DARK = "bg-[#120a19]";
const BG_DARKER = "bg-[#0c0612]";
const BG_ACCENT = "bg-[#1A0D25]";

enum TicketingStatus {
  REGISTRATION = "registration",
  PROCESSING = "processing",
  SUCCESS = "success",
  ERROR = "error",
  ALREADY_REGISTERED = "already_registered"
}

interface PageTicketType extends EventTicket {
  type?: string;
  maxPerOrder?: number;
}

export default function LocationEventTicketingPage() {
  const router = useRouter();
  const [eventId, setEventId] = useState<string | null>(null);
  const { data: session, status: authStatus } = useSession();
  
  const [ticketingStatus, setTicketingStatus] = useState<TicketingStatus>(TicketingStatus.REGISTRATION);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoadingInitialData, setIsLoadingInitialData] = useState(true);
  
  const [event, setEvent] = useState<(Event & { isRegistered?: boolean }) | null>(null);
  const [quantity, setQuantity] = useState<number>(1); 
  const [standardTicket, setStandardTicket] = useState<PageTicketType | null>(null); 
  
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    specialRequirements: ""
  });

  // Initialize eventId from URL
  useEffect(() => {
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      const id = searchParams.get("eventId");
      if (id) {
        setEventId(id);
      } else {
        toast.error("Event ID is missing.");
        router.push("/events"); // Or a generic error page
      }
    }
  }, [router]);

  // Fetch event details and check registration
  useEffect(() => {
    if (!eventId || authStatus === "loading") {
      return;
    }

    const checkRegistrationAndFetchEvent = async () => {
      setIsLoadingInitialData(true);
      try {
        const eventApiResponse = await fetch(`/api/events/${eventId}`);
        if (!eventApiResponse.ok) {
          let errorMsg = `Failed to fetch event details: ${eventApiResponse.statusText}`;
          try {
            const errorData = await eventApiResponse.json();
            errorMsg = errorData.error || errorData.message || errorMsg;
          } catch (jsonError) { /* Ignore */ }
          throw new Error(errorMsg);
        }
        
        const eventDataPayload = await eventApiResponse.json();
        if (!eventDataPayload || !eventDataPayload.event) {
          throw new Error("Event data received in an unexpected format.");
        }
        const fetchedEvent = eventDataPayload.event as Event & { isRegistered?: boolean };
        setEvent(fetchedEvent);

        if (fetchedEvent.isVirtual) {
          console.error("Error: Virtual event routed to location payment page. EventId:", eventId);
          toast.error("This page is for location-based events. You are being redirected.");
          router.replace(`/payments?eventId=${eventId}`); // Redirect to main payments router
          return;
        }
        
        if (authStatus === "authenticated" && fetchedEvent.isRegistered) {
            toast.error("You are already registered for this event.");
            router.push(`/events/${fetchedEvent._id}`);
            return; 
        }
        
        const isFree = fetchedEvent.price === 0 || (fetchedEvent.tickets && fetchedEvent.tickets.every(t => t.price === 0));

        if (isFree) {
          toast("This is a free event. Please complete your registration below.");
          if (!fetchedEvent.tickets || fetchedEvent.tickets.length === 0) {
            setStandardTicket({
              id: "free_location_ticket",
              name: "Free Admission",
              price: 0,
              currency: fetchedEvent.currency || "USD",
              quantity: fetchedEvent.maxAttendees || Infinity,
              sold: 0,
              description: fetchedEvent.shortDescription || fetchedEvent.description || "Entry to the event.",
              maxPerOrder: 10
            });
            setQuantity(1);
          }
        }

        if (fetchedEvent.tickets && fetchedEvent.tickets.length > 0) {
            const foundGlobalTicket = fetchedEvent.tickets.find((t: any) => t.type === "standard") || fetchedEvent.tickets[0];
            if (foundGlobalTicket) {
                setStandardTicket({...foundGlobalTicket, description: foundGlobalTicket.description || "" });
            }
            setQuantity(1); 
        } else if (typeof fetchedEvent.price === 'number' && !isFree) {
            setStandardTicket({
                id: "synthetic_location_id",
                name: "Standard Ticket",
                price: fetchedEvent.price,
                currency: fetchedEvent.currency || "USD",
                quantity: fetchedEvent.maxAttendees || Infinity,
                sold: 0,
                description: fetchedEvent.shortDescription || fetchedEvent.description || "Access to the event venue.",
            });
            setQuantity(1);
        } else if (!isFree) {
             throw new Error("Ticket information for this event is not configured correctly.");
        }

      } catch (error: any) {
        console.error("Error in LocationEventTicketingPage useEffect:", error);
        toast.error(error.message || "Could not load event details.");
        setErrorMessage(error.message || "Could not load event details.");
        setEvent(null); 
      } finally {
        setIsLoadingInitialData(false);
      }
    };
    
    checkRegistrationAndFetchEvent();
  }, [eventId, authStatus, router]);

  useEffect(() => {
    if (session?.user && event) {
      setFormData(prev => ({
        ...prev,
        email: session.user.email || "",
        firstName: prev.firstName || session.user.name?.split(' ')[0] || "",
        lastName: prev.lastName || session.user.name?.split(' ').slice(1).join(' ') || "",
      }));
    }
  }, [session, event]);

  const handleQuantityChange = (change: number) => {
    if (!standardTicket) return;
    const newQuantity = quantity + change;
    const maxQty = Math.min(standardTicket.quantity || 1, standardTicket.maxPerOrder || 10);
    if (newQuantity >= 1 && newQuantity <= maxQty) {
      setQuantity(newQuantity);
    }
  };

  const calculateTotal = () => {
    if (!standardTicket) return 0;
    return quantity * standardTicket.price;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (authStatus !== "authenticated" || !session?.user) {
      toast.error("Please sign in to register or purchase tickets.");
      router.push(`/auth/signin?callbackUrl=${encodeURIComponent(window.location.href)}`);
      return;
    }

    if (!event || !standardTicket || quantity <= 0) {
      toast.error("Event details or ticket information is missing. Please refresh.");
      setTicketingStatus(TicketingStatus.ERROR);
      setErrorMessage("Event/ticket data missing.");
      return;
    }
    
    setTicketingStatus(TicketingStatus.PROCESSING);
    setErrorMessage(null);
    const totalAmount = calculateTotal();

    try {
      if (totalAmount === 0) { // Free location event RSVP
        const rsvpData = {
          eventId: eventId,
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          orderType: "FREE_LOCATION_EVENT_RSVP" as const
        };
        const rsvpResponse = await fetch("/api/orders/rsvp", { 
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(rsvpData),
        });
        const rsvpResult = await rsvpResponse.json();

        if (!rsvpResponse.ok) {
          throw new Error(rsvpResult.error || rsvpResult.message || "RSVP submission failed.");
        }
        toast.success("Registration successful! Redirecting...");
        router.push(`/payments/success?orderId=${rsvpResult.order?._id || rsvpResult.orderId}&eventId=${eventId}&source=rsvp_location`);
      } else { // Paid location event
        // Prepare data for your backend. The exact structure will depend on your backend API and payment provider.
        const backendPaymentPayload = {
          eventId: eventId,
          userId: session.user.id,
          email: formData.email, // User's email for receipt/communication
          items: [{
            ticketId: standardTicket.id || "standard_location_ticket", // ID of the ticket type
            ticketName: standardTicket.name,
            quantity: quantity,
            unitPrice: standardTicket.price,
            currency: standardTicket.currency || event?.currency || "USD",
          }],
          totalAmount: totalAmount,
          // Define where the user should be redirected after payment success or cancellation by the provider
          // The {CHECKOUT_SESSION_ID} or similar placeholders are often replaced by the payment provider on the redirect URL.
          successUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/api/payments/confirm-order?session_id={CHECKOUT_SESSION_ID}&eventId=${eventId}`,
          cancelUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/events/${eventId}`, // Or back to this payment page
          // Any additional metadata your backend might need
          metadata: {
            firstName: formData.firstName,
            lastName: formData.lastName,
            phone: formData.phone,
            eventTitle: event.title,
            // Add any other relevant info for record-keeping or display on receipts
          }
        };

        // Step 1: Call your backend to create a payment session
        // Replace '/api/payments/initiate-payment' with your actual backend endpoint
        const response = await fetch('/api/payments/initiate-payment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(backendPaymentPayload),
        });

        const paymentSessionResult = await response.json();

        if (!response.ok) {
          // paymentSessionResult.error should contain a user-friendly message from the backend
          throw new Error(paymentSessionResult.error || paymentSessionResult.message || 'Failed to initiate payment session.');
        }

        // Step 2: Redirect to the payment provider's checkout page or handle embedded form
        // Your backend should return a URL to redirect the user to (e.g., Stripe Checkout URL)
        // or instructions for an embedded payment flow.
        if (paymentSessionResult.redirectUrl) {
          // For most redirect-based payment flows:
          window.location.href = paymentSessionResult.redirectUrl; 
          // Using window.location.href for external redirects is common.
          // router.push() is generally for in-app navigation.
        } else {
          // Handle other scenarios, e.g., if using an embedded payment form (like Stripe Elements)
          // you might receive a clientSecret here to use with the Stripe.js SDK.
          console.error("Payment session created, but no redirect URL provided (or other action expected).", paymentSessionResult);
          throw new Error('Payment processing error: Could not retrieve payment page URL or next step.');
        }
      }
    } catch (error: any) {
      console.error("Error during form submission:", error);
      setTicketingStatus(TicketingStatus.ERROR);
      setErrorMessage(error.message || "An unexpected error occurred during submission.");
      toast.error(error.message || "Submission failed. Please try again.");
    } finally {
      // If an error occurred, status is ERROR. User can see message and form is active for retry.
      // If successful (free RSVP or redirect for paid), user has navigated away.
      // So, if still PROCESSING here and an error message exists, it means an error happened before navigation.
      if (ticketingStatus === TicketingStatus.PROCESSING && errorMessage) {
         setTicketingStatus(TicketingStatus.REGISTRATION); // Reset to allow retry if stuck in processing with an error
      } else if (ticketingStatus === TicketingStatus.ERROR) {
        // Keep as ERROR, form is implicitly ready for another attempt by user
      }
      // No explicit reset from PROCESSING if no error, as page should be redirecting.
    }
  };
  
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
      });
    } catch (e) { return "Date unavailable"; }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency', currency: standardTicket?.currency || event?.currency || 'USD'
    }).format(amount);
  };

  const getLocationString = (location: Event['location']) => {
    if (!location) return "Location TBD";
    if (typeof location === 'string') return location;
    return `${location.address || 'Venue TBD'}${location.city ? `, ${location.city}` : ''}`;
  };

  if (isLoadingInitialData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black to-[#120a19] flex items-center justify-center">
        <NoiseBackground />
        <Loader className="w-12 h-12 text-[#b967ff] animate-spin" />
        <p className="ml-4 text-[#b967ff] animate-pulse">Loading Event Details...</p>
      </div>
    );
  }

  if (!event && !errorMessage) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black to-[#120a19] flex items-center justify-center">
        <NoiseBackground />
        <div className={`text-center p-8 rounded-xl shadow-xl bg-[#120a19]/70 backdrop-blur-sm border ${BORDER_ACCENT}`}>
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-4">Event Not Found</h2>
          <p className="text-gray-300 mb-6">Details for this event could not be loaded.</p>
          <Link href="/events" className={`inline-flex items-center gap-2 px-6 py-3 ${PURPLE_GRADIENT} text-white rounded-lg hover:opacity-90 transition-opacity`}>
            <ChevronLeft className="w-4 h-4" /> Browse Events
          </Link>
        </div>
      </div>
    );
  }
  
  if (errorMessage && !event) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black to-[#120a19] flex items-center justify-center">
        <NoiseBackground />
        <div className={`text-center p-8 rounded-xl shadow-xl bg-[#120a19]/70 backdrop-blur-sm border ${BORDER_ACCENT}`}>
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-4">Error Loading Event</h2>
          <p className="text-gray-300 mb-6">{errorMessage}</p>
          <button onClick={() => router.push("/events")} className={`inline-flex items-center gap-2 px-6 py-3 ${PURPLE_GRADIENT} text-white rounded-lg hover:opacity-90 transition-opacity`}>
            <ChevronLeft className="w-4 h-4" /> Browse Events
          </button>
        </div>
      </div>
    );
  }

  // Main Page Content Render for Location Event
  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-[#120a19] to-black font-sans antialiased">
      <NoiseBackground />
      <div className="container mx-auto px-4 py-12">
        {event && (
          <div className="mb-8">
            <Link href={`/events/${eventId}`} className="inline-flex items-center gap-2 text-[#b967ff] hover:text-[#b967ff]/80 transition-colors">
              <ChevronLeft className="w-4 h-4" /> Back to Event Details
            </Link>
          </div>
        )}

        {event && standardTicket && (
          <>
            {/* Event Info Section - Emphasizing location */} 
            <div className={`bg-[#120a19]/70 backdrop-blur-sm border ${BORDER_ACCENT} rounded-xl p-4 sm:p-6 shadow-xl mb-8`}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className={`md:col-span-1 h-40 sm:h-48 md:h-auto rounded-lg overflow-hidden ${BG_ACCENT} flex-shrink-0`}>
                  {event.coverImage?.url || event.image ? (
                    <div className="relative w-full h-full">
                      <Image 
                        src={event.coverImage?.url || event.image!}
                        alt={event.title || "Event image"}
                        fill
                        sizes="(max-width: 768px) 100vw, 33vw"
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <MapPin className="w-16 h-16 text-[#b967ff]/30" /> {/* Icon for location event */} 
                    </div>
                  )}
                </div>
                <div className="md:col-span-2">
                  <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2 leading-tight">{event.title}</h1>
                  <div className="flex items-center text-sm text-gray-400 mb-1">
                    <CalendarIcon className="w-4 h-4 mr-2 text-[#b967ff]" />
                    <span>{formatDate(event.date)}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-400 mb-3">
                    <MapPin className="w-4 h-4 mr-2 text-[#b967ff]" />
                    <span>{getLocationString(event.location)}</span>
                  </div>
                  <div className={`bg-[#0c0612]/50 border ${BORDER_ACCENT} rounded-lg p-4`}>
                    <h2 className="text-lg font-semibold text-white mb-3">{standardTicket.name}</h2>
                    {standardTicket.description && <p className="text-sm text-gray-300 mb-3">{standardTicket.description}</p>}
                    <div className="flex justify-between items-center mb-4">
                      <p className={`text-2xl font-bold ${TEXT_ACCENT}`}>{standardTicket.price === 0 ? "Free" : formatCurrency(standardTicket.price)}</p>
                      {standardTicket.price > 0 && (
                        <div className="flex items-center gap-2">
                          <button onClick={() => handleQuantityChange(-1)} disabled={quantity <= 1} className={`p-2 rounded-full bg-[#b967ff]/20 hover:bg-[#b967ff]/30 text-white disabled:opacity-50 transition`}>
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="text-lg font-medium text-white w-8 text-center">{quantity}</span>
                          <button onClick={() => handleQuantityChange(1)} disabled={quantity >= (standardTicket.quantity || 1) || quantity >= (standardTicket.maxPerOrder || 10) } className={`p-2 rounded-full bg-[#b967ff]/20 hover:bg-[#b967ff]/30 text-white disabled:opacity-50 transition`}>
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="text-sm text-gray-400">
                      Available: {standardTicket.quantity === Infinity ? 'Unlimited' : standardTicket.quantity}
                      {standardTicket.maxPerOrder && standardTicket.price > 0 && <span className="ml-2">(Max {standardTicket.maxPerOrder} per order)</span>}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Form and Order Summary */} 
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className={`md:col-span-2 space-y-6 bg-[#120a19]/70 backdrop-blur-sm border ${BORDER_ACCENT} rounded-xl p-6 shadow-xl`}>
                <div>
                  <h2 className="text-xl font-semibold text-white mb-4">Your Information</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="firstName" className="block text-sm font-medium text-gray-300 mb-1">First Name</label>
                      <input type="text" name="firstName" id="firstName" value={formData.firstName} onChange={handleInputChange} required className={`w-full ${BG_ACCENT} border ${BORDER_ACCENT} rounded-md p-2 text-white focus:ring-1 focus:ring-[#b967ff] focus:border-[#b967ff]`} />
                    </div>
                    <div>
                      <label htmlFor="lastName" className="block text-sm font-medium text-gray-300 mb-1">Last Name</label>
                      <input type="text" name="lastName" id="lastName" value={formData.lastName} onChange={handleInputChange} required className={`w-full ${BG_ACCENT} border ${BORDER_ACCENT} rounded-md p-2 text-white focus:ring-1 focus:ring-[#b967ff] focus:border-[#b967ff]`} />
                    </div>
                  </div>
                  <div className="mt-4">
                    <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">Email Address</label>
                    <input type="email" name="email" id="email" value={formData.email} onChange={handleInputChange} required className={`w-full ${BG_ACCENT} border ${BORDER_ACCENT} rounded-md p-2 text-white focus:ring-1 focus:ring-[#b967ff] focus:border-[#b967ff]`} />
                  </div>
                  <div className="mt-4">
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-300 mb-1">Phone Number (Optional)</label>
                    <input type="tel" name="phone" id="phone" value={formData.phone} onChange={handleInputChange} className={`w-full ${BG_ACCENT} border ${BORDER_ACCENT} rounded-md p-2 text-white focus:ring-1 focus:ring-[#b967ff] focus:border-[#b967ff]`} />
                  </div>
                  <div className="mt-4">
                    <label htmlFor="specialRequirements" className="block text-sm font-medium text-gray-300 mb-1">Special Requirements (Optional)</label>
                    <textarea name="specialRequirements" id="specialRequirements" value={formData.specialRequirements} onChange={handleInputChange} rows={3} className={`w-full ${BG_ACCENT} border ${BORDER_ACCENT} rounded-md p-2 text-white focus:ring-1 focus:ring-[#b967ff] focus:border-[#b967ff]`}></textarea>
                  </div>
                </div>
              </div>

              <div className="md:col-span-1">
                <div className={`bg-[#120a19]/70 backdrop-blur-sm border ${BORDER_ACCENT} rounded-xl p-6 shadow-xl sticky top-24`}>
                  <h2 className="text-xl font-semibold text-white mb-4">Order Summary</h2>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Ticket: {standardTicket.name}</span>
                      {standardTicket.price > 0 && <span className="text-white">x {quantity}</span>}
                    </div>
                    {standardTicket.price > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Price per ticket:</span>
                        <span className="text-white">{formatCurrency(standardTicket.price)}</span>
                      </div>
                    )}
                    <hr className="border-gray-700 my-2" />
                    <div className="flex justify-between text-lg font-semibold">
                      <span className="text-white">Total Amount:</span>
                      <span className={TEXT_ACCENT}>{standardTicket.price === 0 ? "Free" : formatCurrency(calculateTotal())}</span>
                    </div>
                  </div>
                  
                  {errorMessage && (
                    <div className="mt-4 p-3 bg-red-900/30 border border-red-700 rounded-md text-red-300 text-sm">
                      <p>{errorMessage}</p>
                    </div>
                  )}

                  <button type="submit" disabled={ticketingStatus === TicketingStatus.PROCESSING || quantity === 0 || !standardTicket} className={`mt-6 w-full ${PURPLE_GRADIENT} hover:opacity-90 text-white font-semibold py-3 px-4 rounded-lg transition duration-200 ease-in-out flex items-center justify-center disabled:opacity-60 disabled:cursor-not-allowed`}>
                    {ticketingStatus === TicketingStatus.PROCESSING ? (
                      <><Loader className="w-5 h-5 mr-2 animate-spin" />Processing...</>
                    ) : (
                      <><CreditCard className="w-5 h-5 mr-2" />{calculateTotal() === 0 ? 'Complete Registration' : 'Proceed to Payment'}</>
                    )}
                  </button>
                  <p className="text-xs text-gray-500 mt-3 text-center">Secure processing.</p>
                </div>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
} 