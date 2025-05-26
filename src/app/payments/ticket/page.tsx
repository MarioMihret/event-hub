"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Image from "next/image";
import html2canvas from "html2canvas";
import { saveAs } from "file-saver";
import {
  Calendar,
  Clock,
  MapPin,
  Download,
  User,
  Mail,
  ChevronLeft,
  Share,
  Ticket,
  QrCode,
  RefreshCw
} from "lucide-react";
import QRCode from "react-qr-code";
import LogoComponent from "./LogoComponent";
import BackgroundElements from "./BackgroundElements";
import FloatingTicket from "./FloatingTicket";
import { toast } from "react-hot-toast";

interface TicketDetails {
  eventId: string;
  eventTitle: string;
  eventDate: string;
  ticketId: string;
  firstName: string;
  lastName: string;
  email: string;
  location: string;
  price: string;
  ticketType: string;
  orderReference: string;
}

export default function TicketPage() {
  const [ticketDetails, setTicketDetails] = useState<TicketDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Diagnostic state hooks
  const [apiTestResult, setApiTestResult] = useState<string | null>(null);
  const [isTestingApi, setIsTestingApi] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  
  const ticketRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  
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
  
  // Test API endpoint manually to debug issues
  const testApiEndpoint = async () => {
    setIsTestingApi(true);
    setApiTestResult(null);
    try {
      // Get orderID from URL
      const urlParams = new URLSearchParams(window.location.search);
      const orderId = urlParams.get("orderId");
      
      if (!orderId) {
        setApiTestResult("No orderId found in URL parameters");
        setIsTestingApi(false);
        return;
      }
      
      // Try the API call
      const startTime = Date.now();
      const response = await fetch(`/api/orders/details?orderId=${orderId}`);
      const endTime = Date.now();
      const status = response.status;
      let body;
      
      try {
        body = await response.json();
      } catch (e) {
        body = "Could not parse JSON response";
      }
      
      setApiTestResult(`API Response (${status}) in ${endTime - startTime}ms: ${JSON.stringify(body, null, 2)}`);
    } catch (e) {
      setApiTestResult(`API Test Error: ${e.message}`);
    } finally {
      setIsTestingApi(false);
    }
  };
  
  // Show available localStorage data related to tickets
  const getDiagnosticInfo = () => {
    try {
      const diagnosticData = {
        inLocalStorage: {
          payment_details: localStorage.getItem("payment_details") || null,
          order_id: localStorage.getItem("order_id") || null,
          event_id: localStorage.getItem("event_id") || null,
          event_is_virtual: localStorage.getItem("event_is_virtual") || null
        },
        fromURL: {
          orderId: new URLSearchParams(window.location.search).get("orderId"),
          eventId: new URLSearchParams(window.location.search).get("eventId"),
          source: new URLSearchParams(window.location.search).get("source")
        }
      };
      return JSON.stringify(diagnosticData, null, 2);
    } catch (e) {
      return `Error getting diagnostic info: ${e.message}`;
    }
  };
  
  useEffect(() => {
    const loadTicketDetails = async () => {
      try {
        // First try to get data from localStorage
        const paymentDetails = localStorage.getItem("payment_details");
        let orderReference = localStorage.getItem("order_id");
        
        // If order reference is not in localStorage, get it directly from URL
        if (!orderReference && typeof window !== "undefined") {
          const urlParams = new URLSearchParams(window.location.search);
          orderReference = urlParams.get("orderId");
          console.log("Got orderId from URL params:", orderReference);
          
          // Check if we're coming from a successful payment
          const source = urlParams.get("source");
          if (source === "payment_success") {
            const toastId = 'payment-success';
            const toastAlreadyShown = sessionStorage.getItem(toastId) === 'shown';
            
            if (!toastAlreadyShown) {
              toast.success('Payment successful! Your tickets are ready.', { 
                id: toastId, 
                duration: 5000 
              });
              // Mark this toast as shown for this session
              sessionStorage.setItem(toastId, 'shown');
            }
          }
        }
        
        // If orderReference is still not found, try to extract it from payment_details
        if (!orderReference && paymentDetails) {
          try {
            const parsedDetails = JSON.parse(paymentDetails);
            if (parsedDetails.order_id || parsedDetails.orderId) {
              orderReference = parsedDetails.order_id || parsedDetails.orderId;
              console.log("Extracted orderId from payment_details:", orderReference);
              // Save it for future use
              localStorage.setItem("order_id", orderReference);
            }
          } catch (e) {
            console.error("Failed to parse payment details:", e);
          }
        }
        
        if (!orderReference) {
          setError("Order ID not found. Cannot load ticket information.");
          setIsLoading(false);
          return;
        }
        
        // If we have payment details in localStorage, use them
        if (paymentDetails) {
          const payment = JSON.parse(paymentDetails);
          const tickets = payment.tickets || [];
          
          if (tickets.length === 0) {
            setError("No tickets found for this order");
            setIsLoading(false);
            return;
          }
          
          // Since we might have multiple tickets, we'll show the first one
          const firstTicket = tickets[0];
          
          setTicketDetails({
            eventId: payment.eventId || "",
            eventTitle: payment.eventTitle || "Event",
            eventDate: payment.eventDate || new Date().toISOString(),
            ticketId: `${orderReference}-${Date.now()}`,
            firstName: payment.firstName || "",
            lastName: payment.lastName || "",
            email: payment.email || "",
            location: formatLocation(payment.location),
            price: firstTicket.price ? `ETB ${firstTicket.price}` : "Free",
            ticketType: firstTicket.name || "Standard",
            orderReference: orderReference
          });
          
          setIsLoading(false);
          return;
        }
        
        // If not in localStorage, fetch from API using the order ID
        console.log("Fetching order details from API for orderID:", orderReference);
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
          
          console.log("Starting API fetch");
          const response = await fetch(`/api/orders/details?orderId=${orderReference}`, {
            signal: controller.signal,
            method: 'GET',
            headers: {
              'Accept': 'application/json'
            }
          });
          
          clearTimeout(timeoutId);
          console.log("API response status:", response.status);
          
          if (!response.ok) {
            let errorMessage;
            try {
              const errorData = await response.json();
              errorMessage = errorData.message || `Failed to fetch order details: ${response.statusText}`;
            } catch (e) {
              errorMessage = `Failed to fetch order details: ${response.statusText}`;
            }
            throw new Error(errorMessage);
          }
          
          let orderData = await response.json();
          console.log("Raw API response data:", JSON.stringify(orderData));
          
          // Normalize API data structure for various formats
          // Some APIs return data wrapped in a data/order/result field
          if (orderData.data) orderData = orderData.data;
          if (orderData.order) orderData = orderData.order;
          if (orderData.result) orderData = orderData.result;
          
          console.log("Normalized order data:", JSON.stringify(orderData));
          
          // Ensure required fields exist with fallbacks
          const normalizedData = {
            eventId: orderData.eventId || "",
            eventTitle: orderData.eventTitle || orderData.title || "",
            eventDate: orderData.eventDate || orderData.date || new Date().toISOString(),
            firstName: orderData.firstName || orderData.billing?.firstName || "",
            lastName: orderData.lastName || orderData.billing?.lastName || "",
            email: orderData.email || orderData.billing?.email || "",
            location: formatLocation(orderData.location) || orderData.venue || "Venue location",
            // Handle different ticket structures
            tickets: orderData.tickets || 
                    (orderData.items ? orderData.items.map(item => ({
                      name: item.ticketName || item.name,
                      price: item.unitPrice || item.price || 0,
                      quantity: item.quantity || 1
                    })) : [{
                      name: "Standard Ticket", 
                      price: 0, 
                      quantity: 1
                    }])
          };
          
          // If we don't have an event ID in the order data, check localStorage
          if (!normalizedData.eventId) {
            const eventId = localStorage.getItem("event_id");
            console.log("No eventId in API response, using from localStorage:", eventId);
            if (eventId) {
              normalizedData.eventId = eventId;
            } else {
              console.warn("No eventId found in API response or localStorage");
            }
          }
          
          // Store normalized data in localStorage for future use
          localStorage.setItem("payment_details", JSON.stringify(normalizedData));
          localStorage.setItem("order_id", orderReference);
          
          // Create ticket details from normalized data
          const tickets = normalizedData.tickets || [];
          if (tickets.length === 0) {
            console.error("No tickets found in normalized data:", normalizedData);
            setError("No tickets found for this order");
            setIsLoading(false);
            return;
          }
          
          const firstTicket = tickets[0];
          
          // Map normalized data to ticket details
          const ticketDetailsFromApi = {
            eventId: normalizedData.eventId,
            eventTitle: normalizedData.eventTitle || "Event",
            eventDate: normalizedData.eventDate,
            ticketId: `${orderReference}-${Date.now()}`,
            firstName: normalizedData.firstName,
            lastName: normalizedData.lastName,
            email: normalizedData.email,
            location: formatLocation(normalizedData.location),
            price: firstTicket.price ? `ETB ${firstTicket.price}` : "Free",
            ticketType: firstTicket.name || "Standard",
            orderReference: orderReference
          };
          
          console.log("Created ticket details:", ticketDetailsFromApi);
          setTicketDetails(ticketDetailsFromApi);
          setIsLoading(false);
          
        } catch (apiError) {
          console.error("API fetch error:", apiError);
          
          // Handle timeout specifically
          if (apiError.name === 'AbortError') {
            setError("Request timed out. The server took too long to respond. Please try again later.");
          } else {
            setError(`Failed to fetch ticket details: ${apiError.message}`);
          }
          
          // Generate mock data for testing if in development mode
          if (process.env.NODE_ENV === 'development' && orderReference !== '682a77f7ab4a41247cc19518') {
            console.log("DEV MODE: Generating mock ticket for debugging");
            setTicketDetails({
              eventId: localStorage.getItem("event_id") || "682a4ebd6e29941314d159d2",
              eventTitle: "Mock Event (Development Only)",
              eventDate: new Date().toISOString(),
              ticketId: `mock-ticket-${Date.now()}`,
              firstName: "Test",
              lastName: "User",
              email: "test@example.com",
              location: "Mock Location",
              price: "Free",
              ticketType: "Test Ticket",
              orderReference: orderReference || "mock_order_id"
            });
          }
          
          setIsLoading(false);
        }
      } catch (err) {
        console.error("Error loading ticket details:", err);
        setError(`Failed to load ticket details: ${err.message}`);
        setIsLoading(false);
      }
    };
    
    loadTicketDetails();
  }, []);
  
  const handleDownloadTicket = async () => {
    if (!ticketRef.current) return;
    
    try {
      const canvas = await html2canvas(ticketRef.current, {
        scale: 2, // Higher quality
        backgroundColor: null,
        logging: false,
      });
      
      canvas.toBlob((blob) => {
        if (blob) {
          saveAs(blob, `ticket-${ticketDetails?.eventTitle.replace(/\s+/g, '-').toLowerCase() || 'event'}.png`);
        }
      });
    } catch (err) {
      console.error("Error generating ticket image:", err);
    }
  };
  
  const handleBackNavigation = () => {
    if (ticketDetails?.eventId) {
      // Special handling for mock event ID
      if (ticketDetails.eventId === 'mockEvent123') {
        router.push('/events');
        return;
      }
      
      // Validate the event ID before navigation
      const isValidEventId = /^[0-9a-fA-F]{24}$/.test(ticketDetails.eventId) || 
                            ticketDetails.eventId === '682a4ebd6e29941314d159d2';
      
      if (isValidEventId) {
        // Navigate directly to the event details page
        router.push(`/events/${ticketDetails.eventId}`);
      } else {
        console.error("Invalid event ID format:", ticketDetails.eventId);
        toast.error("Could not navigate to event details. Invalid event information.");
        router.push('/events'); // Fallback to events list
      }
    } else {
      // Fallback if eventId is missing
      console.error("Cannot navigate: eventId is missing from ticketDetails.");
      toast.error("Could not navigate to event details. Information missing.");
      router.push('/events'); // Redirect to events list as a fallback
    }
  };
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-[#1A0D25] to-black flex items-center justify-center font-sans antialiased p-4">
        <div className="w-12 h-12 border-4 border-[#b967ff] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }
  
  if (error || !ticketDetails) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-[#1A0D25] to-black flex items-center justify-center font-sans antialiased p-4">
        <div className="bg-[#120a19] border border-red-500/20 rounded-xl p-8 max-w-md w-full">
          <div className="text-center">
            <Ticket className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Ticket Not Available</h2>
            <p className="text-gray-400 mb-6">{error || "We couldn't find your ticket information. Please try again later."}</p>
            
            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
              <button
                onClick={() => router.push('/events')}
                className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <ChevronLeft className="w-4 h-4" />
                Back to Events
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 bg-[#b967ff] hover:bg-[#a34de7] text-white rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>
            </div>
            
            {/* API Testing Section */}
            <div className="mt-8 border-t border-gray-700/40 pt-6">
              <p className="text-sm text-gray-400 mb-4">Advanced Troubleshooting</p>
              <div className="flex flex-wrap gap-2 justify-center mb-4">
                <button
                  onClick={testApiEndpoint}
                  disabled={isTestingApi}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors text-sm"
                >
                  {isTestingApi ? "Testing..." : "Test API Endpoint"}
                </button>
                <button
                  onClick={() => setShowDiagnostics(!showDiagnostics)}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors text-sm"
                >
                  {showDiagnostics ? "Hide Diagnostics" : "Show Diagnostics"}
                </button>
              </div>
              
              {apiTestResult && (
                <div className="bg-gray-900/50 p-3 rounded-md border border-gray-700/50 mt-2">
                  <p className="text-xs text-gray-400 mb-1 text-left">API Test Result:</p>
                  <pre className="text-xs text-left text-gray-300 overflow-x-auto p-2 max-h-40 overflow-y-auto">
                    {apiTestResult}
                  </pre>
                </div>
              )}
              
              {showDiagnostics && (
                <div className="bg-gray-900/50 p-3 rounded-md border border-gray-700/50 mt-4">
                  <p className="text-xs text-gray-400 mb-1 text-left">Available Data (localStorage & URL):</p>
                  <pre className="text-xs text-left text-gray-300 overflow-x-auto p-2 max-h-60 overflow-y-auto">
                    {getDiagnosticInfo()}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-[#1A0D25] to-black font-sans antialiased p-4 py-12">
      <BackgroundElements />
      <div className="container mx-auto max-w-4xl">
        <div className="mb-8 flex justify-between items-center">
          <button
            onClick={handleBackNavigation}
            className="flex items-center gap-2 text-[#b967ff] hover:text-[#a34de7] transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Event
          </button>
          
          <button
            onClick={handleDownloadTicket}
            className="px-4 py-2 bg-[#b967ff] hover:bg-[#a34de7] text-white rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            Download Ticket
          </button>
        </div>
        
        {/* Ticket Preview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#120a19] border border-[#b967ff]/20 rounded-xl p-6 shadow-xl mx-auto mb-8"
        >
          <h2 className="text-2xl font-bold text-white mb-6 text-center">Your Event Ticket</h2>
          
          {/* Actual ticket design - this is what will be captured for download */}
          <div className="mx-auto max-w-2xl">
            <FloatingTicket>
              <div 
                ref={ticketRef} 
                className="relative bg-gradient-to-br from-[#1A0D25] to-[#120a19] rounded-lg overflow-hidden border border-[#b967ff]/30 p-0 shadow-2xl"
              >
                {/* Elegant corner decorations */}
                <div className="absolute top-0 left-0 w-16 h-16 overflow-hidden">
                  <div className="w-16 h-16 border-t-2 border-l-2 border-[#b967ff]/40 rounded-tl-lg"></div>
                </div>
                <div className="absolute top-0 right-0 w-16 h-16 overflow-hidden">
                  <div className="w-16 h-16 border-t-2 border-r-2 border-[#b967ff]/40 rounded-tr-lg"></div>
                </div>
                <div className="absolute bottom-0 left-0 w-16 h-16 overflow-hidden">
                  <div className="w-16 h-16 border-b-2 border-l-2 border-[#b967ff]/40 rounded-bl-lg"></div>
                </div>
                <div className="absolute bottom-0 right-0 w-16 h-16 overflow-hidden">
                  <div className="w-16 h-16 border-b-2 border-r-2 border-[#b967ff]/40 rounded-br-lg"></div>
                </div>
                
                {/* Ticket header with pattern */}
                <div className="bg-gradient-to-r from-[#b967ff] to-[#7d4bff] px-6 py-4 relative overflow-hidden">
                  <div className="absolute inset-0 opacity-20">
                    <svg width="100%" height="100%" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                      <pattern id="ticket-pattern" patternUnits="userSpaceOnUse" width="10" height="10" patternTransform="rotate(45)">
                        <rect width="6" height="6" fill="white" />
                      </pattern>
                      <rect width="100%" height="100%" fill="url(#ticket-pattern)" />
                    </svg>
                  </div>
                  <div className="relative z-10 flex justify-between items-center">
                    <div>
                      <h3 className="text-white font-bold text-xl">{ticketDetails.eventTitle}</h3>
                      <p className="text-white/80 text-sm">
                        {new Date(ticketDetails.eventDate).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                    <div className="text-white text-right">
                      <div className="bg-[#ffffff30] backdrop-blur-sm px-3 py-1 rounded-full border border-white/20">
                        <p className="font-bold">{ticketDetails.ticketType}</p>
                        <p className="text-sm">{ticketDetails.price}</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Ticket body */}
                <div className="p-6 relative">
                  {/* Decorative circles on the sides - ticket punch style */}
                  <div className="absolute left-0 top-0 w-4 h-4 rounded-full bg-black -translate-x-1/2 translate-y-6"></div>
                  <div className="absolute right-0 top-0 w-4 h-4 rounded-full bg-black translate-x-1/2 translate-y-6"></div>
                  <div className="absolute left-0 bottom-0 w-4 h-4 rounded-full bg-black -translate-x-1/2 -translate-y-6"></div>
                  <div className="absolute right-0 bottom-0 w-4 h-4 rounded-full bg-black translate-x-1/2 -translate-y-6"></div>
                  
                  {/* Dashed line separator */}
                  <div className="border-t border-dashed border-[#b967ff]/30 -mx-6 my-4"></div>
                  
                  {/* Ticket content grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div>
                        <p className="text-[#b967ff] text-xs uppercase font-semibold tracking-wider">Attendee</p>
                        <p className="text-white font-medium">{ticketDetails.firstName} {ticketDetails.lastName}</p>
                      </div>
                      
                      <div>
                        <p className="text-[#b967ff] text-xs uppercase font-semibold tracking-wider">Email</p>
                        <p className="text-white font-medium">{ticketDetails.email}</p>
                      </div>
                      
                      <div>
                        <p className="text-[#b967ff] text-xs uppercase font-semibold tracking-wider">Location</p>
                        <p className="text-white font-medium">{ticketDetails.location}</p>
                      </div>
                      
                      <div>
                        <p className="text-[#b967ff] text-xs uppercase font-semibold tracking-wider">Event Time</p>
                        <p className="text-white font-medium">
                          {new Date(ticketDetails.eventDate).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true
                          })}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-center justify-center space-y-2 bg-white p-4 rounded-lg relative">
                      {/* Decorative corner designs for QR section */}
                      <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[#b967ff] rounded-tl-md"></div>
                      <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[#b967ff] rounded-tr-md"></div>
                      <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-[#b967ff] rounded-bl-md"></div>
                      <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[#b967ff] rounded-br-md"></div>
                      
                      <QRCode
                        value={`${ticketDetails.ticketId}|${ticketDetails.eventId}|${ticketDetails.email}`}
                        size={150}
                        level="H"
                        bgColor="#FFFFFF"
                        fgColor="#000000"
                      />
                      <p className="text-xs text-black font-medium text-center">
                        TICKET #: {ticketDetails.ticketId.slice(0, 8)}
                      </p>
                      <p className="text-xs text-gray-500 text-center">
                        Order Ref: {ticketDetails.orderReference}
                      </p>
                    </div>
                  </div>
                  
                  <div className="border-t border-dashed border-[#b967ff]/30 -mx-6 my-4"></div>
                  
                  {/* Footer with logo */}
                  <div className="flex items-center justify-between">
                    <div className="text-white/80 text-xs">
                      Powered by <span className="text-[#b967ff] font-medium">EventHorizon</span>
                    </div>
                    <div className="h-8 flex items-center">
                      <LogoComponent />
                    </div>
                  </div>
                </div>
              </div>
            </FloatingTicket>
          </div>
        </motion.div>
        
        {/* Instructions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-[#120a19] border border-[#b967ff]/20 rounded-xl p-6 shadow-xl mx-auto"
        >
          <h3 className="text-xl font-bold text-white mb-4">Instructions</h3>
          
          <div className="space-y-4 text-gray-300">
            <div className="flex items-start gap-3">
              <Download className="w-5 h-5 text-[#b967ff] mt-1 flex-shrink-0" />
              <div>
                <p className="font-medium text-white">Download Your Ticket</p>
                <p className="text-sm">Click the "Download Ticket" button to save your ticket as an image file.</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <QrCode className="w-5 h-5 text-[#b967ff] mt-1 flex-shrink-0" />
              <div>
                <p className="font-medium text-white">Present for Scanning</p>
                <p className="text-sm">Show the QR code at the venue entrance for quick verification.</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <Mail className="w-5 h-5 text-[#b967ff] mt-1 flex-shrink-0" />
              <div>
                <p className="font-medium text-white">Keep Your Email Handy</p>
                <p className="text-sm">A copy of this ticket has been sent to your registered email address.</p>
              </div>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-[#1A0D25]/70 rounded-lg border border-[#b967ff]/10">
            <p className="text-sm text-gray-400">
              <span className="text-[#b967ff] font-medium">Note:</span> Please arrive 15 minutes before the event starts. This ticket is non-transferable and should be presented along with a valid ID.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
} 