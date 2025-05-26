"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Share2, Calendar, ExternalLink, CheckCircle, Ticket, Facebook, Twitter, Linkedin, Mail, Copy, X } from "lucide-react";
import type { Event, EventTicket } from "@/types/event";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import EventRegistrationForm, { EventRegistrationData } from "../EventRegistrationForm";

// Define an extended event type for this component if not already globally defined
// to include userOrderId, which is added by eventService
interface ActionBarEvent extends Event {
  userOrderId?: string;
  likeCount?: number;
  shareCount?: number;
  isLikedByCurrentUser?: boolean;
}

interface EventActionBarProps {
  event: ActionBarEvent; // Use the extended type
  isInHeroArea?: boolean;
  isRegistered?: boolean;
  isExpired?: boolean;
  isScheduledFuture?: boolean;
  isOwner?: boolean;
}

// Helper to find min/max ticket prices
const getTicketPriceRange = (tickets: EventTicket[] | undefined): { min: number, max: number } | null => {
  if (!tickets || tickets.length === 0) return null;
  // Filter out any potential non-numeric prices just in case, though type expects number
  const prices = tickets.map(t => t.price).filter(p => typeof p === 'number' && p >= 0);
  if (prices.length === 0) return null;
  
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);

  // Only return if there are valid prices
  if (minPrice === Infinity || maxPrice === -Infinity) return null;
  
  return { min: minPrice, max: maxPrice };
};

export default function EventActionBar({ 
    event, 
    isInHeroArea = false, 
    isRegistered = false, 
    isExpired = false, 
    isScheduledFuture = false, 
    isOwner = false 
}: EventActionBarProps) {
  const router = useRouter();
  const [isLiked, setIsLiked] = useState(!!event.isLikedByCurrentUser);
  const [currentLikeCount, setCurrentLikeCount] = useState(event.likeCount || 0);
  const [currentShareCount, setCurrentShareCount] = useState(event.shareCount || 0);
  const [showShareOptions, setShowShareOptions] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Registration form states
  const [showRegistrationForm, setShowRegistrationForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Sync counts and isLiked state if event prop updates
  useEffect(() => {
    setCurrentLikeCount(event.likeCount || 0);
    setCurrentShareCount(event.shareCount || 0);
    setIsLiked(!!event.isLikedByCurrentUser);
  }, [event.likeCount, event.shareCount, event.isLikedByCurrentUser, event._id]);

  // Check if explicitly free or all defined tickets are free
  const ticketPriceRange = getTicketPriceRange(event.tickets);
  const isFreeEvent = event.price === 0 && (!ticketPriceRange || ticketPriceRange.min === 0);
  
  // Format price with currency
  const formatPrice = () => {
    if (isFreeEvent) return "Free";
    
    const currency = event.currency || "USD";
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });
    
    // Use ticket range if available and shows variation or is different from base price
    if (ticketPriceRange) {
        if (ticketPriceRange.min === ticketPriceRange.max) {
            // All tickets have the same price
            return formatter.format(ticketPriceRange.min);
        } else if (ticketPriceRange.min === 0) {
            // Starts from free, goes up to max
            return `From Free (up to ${formatter.format(ticketPriceRange.max)})`;
        } else {
            // Price range
            return `${formatter.format(ticketPriceRange.min)} - ${formatter.format(ticketPriceRange.max)}`;
        }
    } else if (event.price > 0) {
         // Fallback to base price if > 0 and no tickets defined/priced
        return formatter.format(event.price);
    } else {
        // Default case if somehow not free but no price info
        return "Check Tickets";
    }
  };

  // Construct share URL, title, and text
  const shareUrl = typeof window !== 'undefined' 
    ? window.location.href 
    : `${process.env.NEXT_PUBLIC_SITE_URL || 'https://events.example.com'}/events/${event._id}`;
    
  const shareTitle = `Join me at: ${event.title}`;
  const shareText = event.shortDescription || `Check out this event: ${event.title}`;

  const copyToClipboard = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        // Optionally call API share count for copy link action as well
        // handleShare('copy_link'); 
      });
    } else {
      console.warn("Clipboard API not available.");
      toast.error("Could not copy link. Please try again or copy manually.");
    }
  };

  const shareLinks = [
    {
      name: 'Facebook',
      icon: <Facebook className="w-4 h-4" />,
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&t=${encodeURIComponent(shareTitle)}`,
      color: 'bg-[#3b5998]/10 hover:bg-[#3b5998]/20 text-[#3b5998]'
    },
    {
      name: 'Twitter',
      icon: <Twitter className="w-4 h-4" />,
      url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareTitle)}&url=${encodeURIComponent(shareUrl)}`,
      color: 'bg-[#1da1f2]/10 hover:bg-[#1da1f2]/20 text-[#1da1f2]'
    },
    {
      name: 'LinkedIn',
      icon: <Linkedin className="w-4 h-4" />,
      url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
      color: 'bg-[#0077b5]/10 hover:bg-[#0077b5]/20 text-[#0077b5]'
    },
    {
      name: 'Email',
      icon: <Mail className="w-4 h-4" />,
      url: `mailto:?subject=${encodeURIComponent(shareTitle)}&body=${encodeURIComponent(`${shareText}\n\n${shareUrl}`)}`,
      color: 'bg-[#d44638]/10 hover:bg-[#d44638]/20 text-[#d44638]'
    }
  ];

  // Toggle like status with animation
  const handleToggleLike = async () => {
    const originalIsLiked = isLiked;
    const originalLikeCount = currentLikeCount;

    // Optimistic update
    setIsLiked(!originalIsLiked);
    setCurrentLikeCount(originalIsLiked ? currentLikeCount - 1 : currentLikeCount + 1);

    try {
      const endpoint = originalIsLiked ? `/api/events/${event._id}/unlike` : `/api/events/${event._id}/like`;
      const response = await fetch(endpoint, { method: 'PATCH' });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update like status');
      }
      // Success, data is already optimistically updated.
      // Optionally, fetch the event again to get the true count if many users are liking.
      // For now, we assume our optimistic update is fine.
      // const updatedEvent = await response.json(); // if API returns updated event
      // setCurrentLikeCount(updatedEvent.likeCount);
      toast.success(originalIsLiked ? "Unliked!" : "Liked!");
    } catch (error: any) {
      console.error("Failed to toggle like:", error);
      toast.error(error.message || "Couldn\\'t update like.");
      // Revert optimistic update
      setIsLiked(originalIsLiked);
      setCurrentLikeCount(originalLikeCount);
    }
  };
  
  // Toggle share options
  const toggleShareOptions = () => {
    setShowShareOptions(!showShareOptions);
  };
  
  // Handle registration based on event type
  const handleRegister = () => {
    // For free events (virtual or physical), use simplified RSVP
    if (isFreeEvent) {
      router.push(`/events/rsvp?eventId=${event._id}`);
      return;
    }
    
    // For paid events, show registration form first
    setShowRegistrationForm(true);
  };
  
  // Process form submission and payment
  const handleFormSubmit = async (formData: EventRegistrationData) => {
    try {
      setIsSubmitting(true);
      
      // Determine which redirect URL to use based on event type
      const returnUrl = event.isVirtual 
        ? `/payments/meeting?source=payment&eventId=${event._id}` 
        : `/payments/ticket?source=payment`;
      
      // Store the user information before attempting payment
      localStorage.setItem('user_email', formData.email);
      localStorage.setItem('user_name', `${formData.firstName} ${formData.lastName}`);
      localStorage.setItem('user_phone', formData.phone);
      
      try {
        // Initialize payment via API
        const response = await fetch('/api/payment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: event.price || 0,
            currency: event.currency || 'ETB',
            email: formData.email,
            firstName: formData.firstName,
            lastName: formData.lastName,
            phone: formData.phone,
            callback_url: `${window.location.origin}/api/payment/callback`,
            return_url: `${window.location.origin}${returnUrl}`,
            eventId: event._id,
            tickets: event.tickets || [{ 
              ticketId: 'default', 
              name: event.title ? `Ticket for ${event.title}` : 'Event Ticket', 
              price: event.price || 0,  
              quantity: 1
            }],
            customization: {
              title: `Ticket for ${event.title || 'Event'}`,
              description: `Payment for ${event.isVirtual ? 'virtual' : 'in-person'} event ticket`
            }
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          const errorMessage = errorData.error || errorData.message || 'Failed to initialize payment';
          
          // Check if it's a connectivity issue with the payment provider
          if (errorMessage.includes('ENOTFOUND') || errorMessage.includes('getaddrinfo')) {
            throw new Error('Unable to connect to payment provider. This could be due to network issues or the payment service being unavailable.');
          }
          
          throw new Error(errorMessage);
        }

        const paymentData = await response.json();
        console.log("Payment initialized:", paymentData);
        
        // Store the orderId in localStorage for ticket retrieval
        if (paymentData.orderId) {
          localStorage.setItem('order_id', paymentData.orderId);
          
          // Update or create payment_details with the orderId and user information
          try {
            const paymentDetails = {
              order_id: paymentData.orderId,
              eventId: event._id,
              eventTitle: event.title || '',
              eventDate: event.date || new Date().toISOString(),
              email: formData.email,
              firstName: formData.firstName, 
              lastName: formData.lastName,
              phone: formData.phone,
              amount: event.price || 0,
              tickets: event.tickets || [{ 
                ticketId: 'default', 
                name: event.title ? `Ticket for ${event.title}` : 'Event Ticket', 
                price: event.price || 0,  
                quantity: 1
              }]
            };
            
            localStorage.setItem('payment_details', JSON.stringify(paymentDetails));
          } catch (err) {
            console.error("Error updating payment details in localStorage", err);
          }
        }

        // If there's a checkout URL, redirect to it
        if (paymentData.checkout_url) {
          window.location.href = paymentData.checkout_url;
        } else {
          // Otherwise fallback to our payments page
          router.push(`/payments?eventId=${event._id}`);
        }
      } catch (error: any) {
        // Check if in development mode
        const isDevelopment = process.env.NODE_ENV === 'development' || window.location.hostname === 'localhost';
        
        if (isDevelopment && error.message.includes('payment provider')) {
          // For development environments when payment provider is unreachable
          toast.error("Payment provider unreachable. In development mode, you can simulate a successful payment.");
          
          // Create mock payment details for development testing
          const mockOrderId = `DEV-${Date.now()}`;
          localStorage.setItem('order_id', mockOrderId);
          
          const mockPaymentDetails = {
            order_id: mockOrderId,
            eventId: event._id,
            eventTitle: event.title || 'Development Test Event',
            eventDate: event.date || new Date().toISOString(),
            email: formData.email,
            firstName: formData.firstName,
            lastName: formData.lastName,
            phone: formData.phone,
            amount: event.price || 0,
            tickets: event.tickets || [{
              ticketId: 'default',
              name: event.title ? `Ticket for ${event.title}` : 'Event Ticket',
              price: event.price || 0,
              quantity: 1
            }],
            dev_mode: true
          };
          
          localStorage.setItem('payment_details', JSON.stringify(mockPaymentDetails));
          
          // Redirect to the appropriate page based on event type, with development mode flag
          if (event.isVirtual) {
            // Direct string construction to avoid HTML encoding
            const url = `/payments/meeting?source=payment&eventId=${event._id}&dev=true`;
            router.push(url);
          } else {
            // Direct string construction to avoid HTML encoding
            const url = `/payments/ticket?source=payment&dev=true`;
            router.push(url);
          }
          return;
        }
        
        throw error; // Re-throw if not handled specially
      }
    } catch (error: any) {
      console.error("Payment initialization failed:", error);
      toast.error(error.message || "Could not process payment. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle add to calendar
  const handleAddToCalendar = () => {
    // This would be implemented to handle adding to calendar
    console.log("Add to calendar:", event._id);
  };

  // Handle View Access - reusing meeting page logic for now
  const handleViewAccess = () => {
      if (event.isVirtual) {
          // For virtual events, navigate to meeting page with eventId and userOrderId
          if (event.userOrderId) {
            router.push(`/payments/meeting?eventId=${event._id}&orderId=${event.userOrderId}`);
          } else {
            // Fallback if userOrderId is somehow missing, though it should be there if registered
            console.warn("User is registered for virtual event, but userOrderId is missing. Navigating without it.");
            router.push(`/payments/meeting?eventId=${event._id}`);
          }
      } else {
          // For physical events, navigate to the ticket page with userOrderId
          if (event.userOrderId) {
            router.push(`/payments/ticket?orderId=${event.userOrderId}`); 
          } else {
            // Fallback if userOrderId is missing. This might lead to issues on the ticket page.
            console.warn("User is registered for physical event, but userOrderId is missing. Navigating without it for /payments/ticket.");
            router.push(`/payments/ticket`); // This will likely fail or show no tickets
          }
      }
  };

  const handleShare = async (platform: string) => {
    console.log(`Share via ${platform} for event ${event._id}`);
    setShowShareOptions(false); // Close share menu

    const originalShareCount = currentShareCount;
    setCurrentShareCount(currentShareCount + 1); // Optimistic update

    try {
      const response = await fetch(`/api/events/${event._id}/share`, { method: 'PATCH' });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update share count');
      }
      // Share count incremented on backend
      toast.success("Shared!");
    } catch (error: any) {
      console.error("Failed to increment share count:", error);
      toast.error(error.message || "Couldn\\'t update share count.");
      setCurrentShareCount(originalShareCount); // Revert
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className={`w-full ${isInHeroArea ? '' : 'sticky top-4 z-30'} mb-4 sm:mb-6 md:mb-8 relative`}
      >
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-[#1A0D25]/70 backdrop-blur-md p-3 sm:p-4 rounded-xl border border-[#b967ff]/20">
          {/* Price */}
          <div className="flex flex-col">
            <span className="text-gray-400 text-xs sm:text-sm">Price</span>
            <span className="text-white text-xl sm:text-2xl font-bold">
              {formatPrice()}
            </span>
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Register/RSVP Button - Shown if not owner, not registered, not expired/scheduled */}
            {(!isOwner && !isRegistered && !isExpired && !isScheduledFuture) ? (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleRegister}
                className="px-4 sm:px-6 py-2 bg-[#b967ff] hover:bg-[#a43dff] text-white text-sm sm:text-base font-medium rounded-lg transition-colors flex items-center gap-1 sm:gap-2"
              >
                <span>{isFreeEvent ? "RSVP Now" : "Get Tickets"}</span> 
                {isFreeEvent ? <ExternalLink className="w-3 h-3 sm:w-4 sm:h-4" /> : <Ticket className="w-3 h-3 sm:w-4 sm:h-4" />}
              </motion.button>
            ) : null}
            
            {/* --- UPDATED Registered State: Shows if user is registered and event is not expired/scheduled future --- */}
            {!isOwner && isRegistered && !isExpired && !isScheduledFuture && (
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleViewAccess}
                className={`px-4 sm:px-6 py-2 text-sm sm:text-base font-medium rounded-lg border flex items-center gap-1 sm:gap-2 transition-colors ${
                  event.isVirtual 
                  ? 'bg-green-600/20 hover:bg-green-600/30 text-green-300 border-green-500/30 cursor-pointer' 
                  : 'bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border-purple-500/30 cursor-pointer'
                }`}
              >
                <CheckCircle className={`w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 ${event.isVirtual ? 'text-green-400' : 'text-purple-400'}`} />
                <span>{event.isVirtual ? "View Access" : "View Ticket"}</span>
                {event.isVirtual ? <ExternalLink className="w-3 h-3 sm:w-4 sm:h-4" /> : <Ticket className="w-3 h-3 sm:w-4 sm:h-4" />}
              </motion.button>
            )}

            {/* Attended Indicator (Registered AND Expired) */}
            {!isOwner && isRegistered && isExpired && (
               <motion.div
                 initial={{ opacity: 0, scale: 0.9 }}
                 animate={{ opacity: 1, scale: 1 }}
                 className="px-4 sm:px-6 py-2 bg-gray-600/20 text-gray-400 text-sm sm:text-base font-medium rounded-lg border border-gray-500/30 flex items-center gap-1 sm:gap-2"
               >
                 <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                 <span>Attended</span>
               </motion.div>
            )}
            
            {/* Add to Calendar */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleAddToCalendar}
              className="p-2 bg-[#2D1D3A] hover:bg-[#3A2842] text-white rounded-lg border border-[#b967ff]/30 transition-colors"
            >
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
            </motion.button>
            
            {/* Like and Share Buttons (Grouped for alignment) */}
            <div className="flex items-center border border-[#b967ff]/10 rounded-lg bg-[#1A0D25]/30 px-1 py-1">
              {/* Like Button */}
              <motion.button
                whileHover={{ scale: 1.1 }} 
                whileTap={{ scale: 0.9 }}
                onClick={handleToggleLike}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors ${isLiked ? 'text-red-400 bg-red-500/10' : 'text-gray-400 hover:text-red-400 hover:bg-red-500/10'}`}
                aria-label={isLiked ? "Unlike event" : "Like event"}
              >
                <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : 'fill-transparent'}`} />
                <span className="text-xs font-medium">{currentLikeCount}</span>
              </motion.button>

              {/* Divider (optional) */}
               <div className="h-5 w-px bg-[#b967ff]/10 mx-1"></div> 

              {/* Share Button (using ShareEvent component) */}
              {/* Ensure ShareEvent component has appropriate aria-label if it's just an icon */}
              {/* The previous ShareEvent component extracted had text, which is good */}
              {/* If using a different Share button here: */}
              <button
                 onClick={toggleShareOptions} 
                 className="flex items-center gap-1.5 px-2 py-1 rounded-md text-gray-400 hover:text-[#b967ff] hover:bg-[#b967ff]/10 transition-colors"
                 aria-label="Share event"
              >
                <Share2 className="w-4 h-4" />
                <span className="text-xs font-medium">{currentShareCount}</span>
              </button>
            </div>
          </div>
        </div>
        
        {/* Share Options Modal/Popover - Integrated from ShareEvent.tsx */}
        <AnimatePresence>
          {showShareOptions && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="absolute top-full right-0 mt-2 p-3 bg-[#0e0514]/95 backdrop-blur-lg rounded-lg border border-[#b967ff]/30 shadow-2xl min-w-[250px] z-40"
            >
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-white text-sm font-medium">Share This Event</h4>
                <button 
                  onClick={toggleShareOptions}
                  className="text-gray-400 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10"
                  aria-label="Close share menu"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <div className="flex flex-col gap-2">
                <div className="grid grid-cols-2 gap-2 mb-2">
                  {shareLinks.map((link) => (
                    <a
                      key={link.name}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex items-center gap-2 p-2 rounded-md transition-colors text-xs font-medium ${link.color}`}
                      onClick={(e) => {
                        e.preventDefault(); 
                        window.open(link.url, '_blank', 'width=600,height=400,noopener,noreferrer');
                        handleShare(link.name.toLowerCase());
                      }}
                    >
                      {link.icon}
                      <span>{link.name}</span>
                    </a>
                  ))}
                </div>
                
                <div className="flex items-center gap-2 p-2 rounded-md bg-[#2a1a38]/50">
                  <input
                    type="text"
                    readOnly
                    value={shareUrl}
                    className="bg-transparent text-gray-300 text-xs flex-1 outline-none truncate p-1"
                    aria-label="Event share URL"
                    onFocus={(e) => e.target.select()}
                  />
                  <button
                    onClick={copyToClipboard}
                    className="p-2 rounded bg-[#b967ff]/10 hover:bg-[#b967ff]/20 text-[#b967ff] transition-colors relative"
                    aria-label="Copy event link"
                  >
                    {copied ? (
                      <motion.div
                        initial={{ scale: 0.8, opacity: 0, y:5 }}
                        animate={{ scale: 1, opacity: 1, y:0 }}
                        className="absolute -top-9 left-1/2 -translate-x-1/2 px-2 py-1 bg-black text-white text-xs rounded whitespace-nowrap shadow-lg"
                        role="status"
                      >
                        Copied!
                      </motion.div>
                    ) : null}
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Registration Form Modal */}
      <AnimatePresence>
        {showRegistrationForm && (
          <EventRegistrationForm
            eventId={event._id}
            isVirtual={event.isVirtual || false}
            onClose={() => setShowRegistrationForm(false)}
            onSubmit={handleFormSubmit}
            isSubmitting={isSubmitting}
          />
        )}
      </AnimatePresence>

      {/* Engagement Counts Display */}
      <div className="flex justify-end items-center gap-3 sm:gap-4 text-xs sm:text-sm text-gray-400 mb-4 sm:mb-6 md:mb-8 px-1">
        <div className="flex items-center gap-1" title="Likes">
          <Heart className="w-3 h-3 sm:w-4 sm:h-4" />
          <span>{currentLikeCount}</span>
        </div>
        <div className="flex items-center gap-1" title="Shares">
          <Share2 className="w-3 h-3 sm:w-4 sm:h-4" />
          <span>{currentShareCount}</span>
        </div>
      </div>
    </>
  );
} 