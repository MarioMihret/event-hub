"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useCallback, useMemo } from "react";
import {
  X,
  Calendar,
  Clock,
  MapPin,
  FileText,
  Copy,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  ChevronLeft,
  Share,
  Facebook,
  Twitter,
  Linkedin,
  Mail,
  Bell,
  RefreshCw,
  Loader2,
  Ticket,
  Info
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import JitsiMeeting from '@/components/JitsiMeeting';
import Link from "next/link";
import { toast } from "react-hot-toast";

interface MeetingPageDetails {
  eventId: string;
  eventTitle: string;
  eventDate: string;
  email: string;
  amount: number;
  firstName: string;
  lastName: string;
  orderId: string;
  isVirtual?: boolean;
  location?: any;
  meetingLink?: string | null;
  roomName?: string | null;
  userId?: string;
  isModerator?: boolean;
  userDisplayName?: string;
  meetingPlatform?: string | null;
  registered?: boolean; // Whether the user is registered for this event
  registrationDate?: string; // When the user registered
}

const LOCAL_STORAGE_KEY_PREFIX = "meetingDetails_";

export default function MeetingClientPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [meetingDetails, setMeetingDetails] = useState<MeetingPageDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  
  const [copied, setCopied] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [reminderSet, setReminderSet] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<string>('default');
  const [showJitsiMeeting, setShowJitsiMeeting] = useState(false);

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

  // Use searchParams hook for robust URL parameter parsing
  const urlEventId = useMemo(() => {
    if (searchParams) {
      return searchParams.get("eventId");
    }
    return null;
  }, [searchParams]);
  
  const urlOrderId = useMemo(() => {
    if (searchParams) {
      return searchParams.get("orderId");
    }
    return null;
  }, [searchParams]);
  
  const source = useMemo(() => {
    if (searchParams) {
      return searchParams.get("source");
    }
    return null;
  }, [searchParams]);
  
  const localStorageKey = useMemo(() => {
    if (urlEventId && urlOrderId) {
      return `${LOCAL_STORAGE_KEY_PREFIX}${urlEventId}_${urlOrderId}`;
    }
    return null;
  }, [urlEventId, urlOrderId]);

  // Debug useEffect to log URL parameters
  useEffect(() => {
    if (typeof window !== 'undefined') {
      console.log('Debug URL info (using searchParams):');
      console.log('Full URL (from window.location):', window.location.href);
      console.log('Raw search (from window.location):', window.location.search);
      console.log('Parsed eventId (from searchParams):', urlEventId);
      console.log('Parsed orderId (from searchParams):', urlOrderId);
      console.log('Parsed source (from searchParams):', source);
    }
  }, [urlEventId, urlOrderId, source]);

  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  useEffect(() => {
    const loadDetails = async () => {
      if (!urlEventId) {
        setFetchError("Event ID is missing from the URL.");
        setIsLoading(false);
        return;
      }

      if (!urlOrderId) {
        setFetchError("Order ID is missing from the URL. Please ensure you have a valid meeting link.");
        setIsLoading(false);
        return;
      }

      // Check for the mock event ID pattern from the development data
      // Reject mock IDs but allow our real event IDs
      if (urlEventId === 'mockEvent123') {
        setFetchError("This is a mock event ID used for development and cannot access the meeting page. Please use a real event.");
        setIsLoading(false);
        return;
      }

      if (!meetingDetails) {
        setIsLoading(true);
      }
      setFetchError(null);

      // Show success message for users coming from payment flow
      if (source === 'payment_success') {
        const toastId = 'payment-success';
        const toastAlreadyShown = sessionStorage.getItem(toastId) === 'shown';
        
        if (!toastAlreadyShown) {
          toast.success('Payment successful! Welcome to the virtual event.', { 
            id: toastId, 
            duration: 5000 
          });
          // Mark this toast as shown for this session
          sessionStorage.setItem(toastId, 'shown');
        }
      }

      if (!meetingDetails && localStorageKey) {
        try {
          const cachedData = localStorage.getItem(localStorageKey);
          if (cachedData) {
            const parsedData = JSON.parse(cachedData) as MeetingPageDetails;
            if (parsedData.eventId === urlEventId && parsedData.orderId === urlOrderId) {
              setMeetingDetails(parsedData);
            }
          }
        } catch (e) {
          console.warn("Failed to parse meeting details from localStorage", e);
          localStorage.removeItem(localStorageKey); 
        }
      }
      
      try {
        const response = await fetch(`/api/orders/verify-and-fetch-event-details?eventId=${encodeURIComponent(urlEventId)}&orderId=${encodeURIComponent(urlOrderId)}`);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: `API request failed with status ${response.status}` }));
          throw new Error(errorData.message || `Failed to fetch meeting details: ${response.statusText}`);
        }
        
        const data = await response.json() as MeetingPageDetails;

        setMeetingDetails(data);
        if (localStorageKey) {
          localStorage.setItem(localStorageKey, JSON.stringify(data));
        }
        setFetchError(null);
      } catch (error: any) {
        console.error("Error fetching meeting details from API:", error);
        if (!meetingDetails) { 
             setFetchError(error.message || "Failed to load crucial event information.");
        } else {
            toast.error("Could not refresh event details. Displaying current information.");
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadDetails();
  }, [urlEventId, urlOrderId, localStorageKey, source]);

  const eventTitle = meetingDetails?.eventTitle;
  const eventDate = meetingDetails?.eventDate;
  const isVirtual = meetingDetails?.isVirtual;
  const meetingLink = meetingDetails?.meetingLink;
  const roomName = meetingDetails?.roomName;
  const meetingPlatform = meetingDetails?.meetingPlatform;
  const userDisplayName = meetingDetails?.userDisplayName;
  const isModerator = meetingDetails?.isModerator;

  const [timeLeft, setTimeLeft] = useState<{days: number, hours: number, minutes: number, seconds: number} | null>(null);
  const [meetingStarted, setMeetingStarted] = useState(false);

  // Derived state to determine if the basic conditions for joining a Jitsi meeting are met
  const canJoinMeetingBasis = useMemo(() => {
    if (isLoading || !meetingDetails) return false;
    return !!(
        meetingDetails.isVirtual &&
        meetingDetails.meetingPlatform === 'JITSI' &&
        meetingDetails.roomName &&
        meetingDetails.userDisplayName // Ensure display name is also ready for Jitsi
    );
  }, [isLoading, meetingDetails]);

  useEffect(() => {
    if (!eventDate) {
      setTimeLeft(null);
      setMeetingStarted(false);
      return;
    }

    const calculateTimeLeft = () => {
      const eventTime = new Date(eventDate).getTime();
      const now = new Date().getTime();
      const difference = eventTime - now;

      if (difference <= 0) {
        setTimeLeft(null);
        setMeetingStarted(true);
        return;
      }
      setMeetingStarted(false);
      setTimeLeft({
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      });
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [eventDate]);

  const handleCopyLink = useCallback(() => {
    if (!meetingLink || !meetingStarted) return;
    
    navigator.clipboard.writeText(meetingLink)
      .then(() => {
        setCopied(true);
        toast.success("Meeting link copied!");
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(err => {
        console.error("Failed to copy meeting link:", err);
        toast.error("Failed to copy link.");
      });
  }, [meetingLink, meetingStarted]);

  const handleBackToEvent = useCallback(() => {
    if (meetingDetails?.eventId) {
      router.push(`/events/${meetingDetails.eventId}`);
    } else {
      router.push('/events');
    }
  }, [router, meetingDetails?.eventId]);

  const handleShare = useCallback((platform: string) => {
    if (!eventTitle || !meetingDetails?.eventId) return;
    const eventUrl = `${window.location.origin}/events/${meetingDetails.eventId}`;
    const text = `Check out this event: ${eventTitle}`;
    let shareUrl = "";

    switch (platform) {
      case "facebook":
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(eventUrl)}`;
        break;
      case "twitter":
        shareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(eventUrl)}&text=${encodeURIComponent(text)}`;
        break;
      case "linkedin":
        shareUrl = `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(eventUrl)}&title=${encodeURIComponent(eventTitle)}&summary=${encodeURIComponent(text)}`;
        break;
      case "email":
        shareUrl = `mailto:?subject=${encodeURIComponent(eventTitle)}&body=${encodeURIComponent(text + "\n\nJoin here: " + eventUrl)}`;
        break;
    }
    if (shareUrl) {
      window.open(shareUrl, "_blank", "noopener,noreferrer");
    }
    setShowShareMenu(false);
  }, [eventTitle, meetingDetails?.eventId]);

  const requestNotificationPermissionAndSetReminder = async () => {
    if (!('Notification' in window)) {
      toast.error("Browser notifications not supported.");
      return;
    }

    if (notificationPermission === 'granted') {
      setReminder();
    } else if (notificationPermission !== 'denied') {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      if (permission === 'granted') {
        setReminder();
      } else {
        toast.error("Notification permission denied. Cannot set reminder.");
      }
    } else {
      toast.error("Notifications are blocked. Please enable them in your browser settings.");
    }
  };

  const setReminder = () => {
    if (!eventDate || !eventTitle) {
        toast.error("Event details missing, cannot set reminder.");
        return;
    }
    const eventTime = new Date(eventDate).getTime();
    const now = new Date().getTime();
    const timeToEvent = eventTime - now;

    if (timeToEvent <= 0) {
      toast("This event has already started or passed.");
      return;
    }
    
    const reminderTime = eventTime - (15 * 60 * 1000); 
    if (reminderTime <= now) {
        new Notification(eventTitle, {
            body: "This event is starting very soon!",
            icon: "/icon.png",
        });
        toast.success("Reminder: Event is starting soon!");
        setReminderSet(true);
        return;
    }

    const timeoutId = setTimeout(() => {
      new Notification(eventTitle, {
        body: "This event is starting in 15 minutes!",
        icon: "/icon.png",
      });
    }, reminderTime - now );
    
    console.log(`Reminder set for ${eventTitle} at ${new Date(reminderTime).toLocaleString()}`);
    toast.success("Reminder set for 15 minutes before the event!");
    setReminderSet(true);

    return () => clearTimeout(timeoutId);
  };

  const handleOpenJitsiMeeting = useCallback(() => {
    if (!canJoinMeetingBasis) {
      if (isLoading) {
        toast.error("Still loading event details. Please wait.");
      } else if (!meetingDetails?.isVirtual) {
        toast.error("This is not a virtual event.");
      } else if (meetingDetails?.meetingPlatform !== 'JITSI') {
        toast.error("This event does not use Jitsi for streaming.");
      } else if (!meetingDetails?.roomName) {
        toast.error("Meeting room information is missing.");
      } else if (!meetingDetails?.userDisplayName) {
        toast.error("User display name is missing for the meeting.");
      } else {
        toast.error("Cannot join Jitsi meeting. Essential details are missing.");
      }
      return;
    }

    if (!meetingStarted && eventDate) { // Check if meeting hasn't started but event date is known
        const eventTime = new Date(eventDate).getTime();
        const now = new Date().getTime();
        if (eventTime > now) {
            toast.error("Meeting has not started yet. Starts at " + new Date(eventDate).toLocaleTimeString());
            return;
        }
        // If somehow meetingStarted is false but current time is past eventDate, allow joining.
    }

    setShowJitsiMeeting(true);
  }, [canJoinMeetingBasis, meetingStarted, isLoading, meetingDetails, eventDate]);

  const handleCloseJitsiMeeting = () => setShowJitsiMeeting(false);

  // Error component
  const ErrorDisplay = () => {
    if (!fetchError) return null;
    
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#190d25]/60 backdrop-blur-md border border-[#b967ff]/20 rounded-2xl p-8 shadow-xl max-w-md w-full text-center"
        >
          <div className="w-20 h-20 mx-auto bg-red-500/20 rounded-full flex items-center justify-center mb-6">
            <AlertCircle className="w-10 h-10 text-red-400" />
          </div>
          
          <h3 className="text-2xl font-bold text-white mb-4">Unable to Load Meeting</h3>
          <p className="text-gray-300 mb-8">{fetchError}</p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button 
              onClick={handleBackToEvent} 
              className="px-5 py-3 bg-[#24123a] hover:bg-[#331a53] border border-[#b967ff]/30 rounded-xl text-white transition-colors"
            >
              <span className="flex items-center justify-center gap-2">
                <ChevronLeft className="w-4 h-4" />
                Back to Event
              </span>
            </button>
            
            <button 
              onClick={() => router.push('/events')}
              className="px-5 py-3 bg-gradient-to-r from-[#b967ff] to-[#7d4bff] hover:from-[#a43dff] hover:to-[#6a3bc7] rounded-xl text-white transition-colors"
            >
              <span className="flex items-center justify-center gap-2">
                Browse Events
                <ChevronLeft className="w-4 h-4 rotate-180" />
              </span>
            </button>
          </div>
        </motion.div>
      </div>
    );
  };

  if (isLoading && !meetingDetails) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white p-4">
        <Loader2 className="animate-spin h-12 w-12 text-purple-400" />
        <p className="mt-4 text-lg">Loading meeting details...</p>
      </div>
    );
  }

  if (fetchError && !meetingDetails) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-[#1A0D25] to-black flex items-center justify-center p-4">
        <ErrorDisplay />
      </div>
    );
  }
  
  if (!meetingDetails) {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white p-4">
            <p>No meeting details available. Please check the event ID and order ID in the URL.</p>
             <button
                onClick={() => router.push('/events')}
                className="mt-6 px-6 py-2 bg-purple-600 hover:bg-purple-700 rounded-md text-white transition-colors flex items-center gap-2"
            >
            <ChevronLeft size={20} /> Go to Events
          </button>
        </div>
    );
  }

  const CountdownTimer = () => {
    return (
      <div className="flex gap-3 md:gap-4 justify-center">
        {['days', 'hours', 'minutes', 'seconds'].map((unit) => (
          <div key={unit} className="flex flex-col items-center bg-[#24123a]/80 border border-[#b967ff]/10 p-3 rounded-xl w-16 md:w-20">
            <span className="text-xl md:text-3xl font-bold text-[#b967ff]">{(timeLeft as any)[unit]}</span>
            <span className="text-xs text-gray-400 uppercase mt-1">{unit}</span>
          </div>
        ))}
      </div>
    );
  };

  // Corrected props for JitsiMeeting, ensuring non-null assertions are safe due to `canJoinMeetingBasis`
  const jitsiMeetingProps = canJoinMeetingBasis && meetingDetails && userDisplayName ? {
    roomSlug: meetingDetails.roomName!,
    displayName: userDisplayName!,
    userEmail: meetingDetails.email,
    userId: meetingDetails.userId,
    isModerator: !!meetingDetails.isModerator,
    onClose: handleCloseJitsiMeeting,
    eventTitle: meetingDetails.eventTitle,
  } : null;

  return (
    <AnimatePresence>
      {showJitsiMeeting && jitsiMeetingProps && (
        <motion.div
          className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center p-4"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.3 }}
        >
          <div className="w-full h-full md:h-[calc(100%-80px)] md:w-[calc(100%-80px)] max-w-screen-2xl max-h-[1200px] bg-gray-900 rounded-xl shadow-2xl overflow-hidden relative">
            <JitsiMeeting {...jitsiMeetingProps} />
            <button
              onClick={handleCloseJitsiMeeting}
              className="absolute top-3 right-3 z-50 p-2 bg-gray-800/70 hover:bg-red-600/90 rounded-full text-white transition-colors"
              aria-label="Close Meeting"
            >
              <X size={20} />
            </button>
          </div>
        </motion.div>
      )}

      <main className="min-h-screen bg-gradient-to-br from-black via-[#0d0614] to-[#170b24] text-white">
        {fetchError ? (
          <ErrorDisplay />
        ) : (
          <div className="max-w-5xl mx-auto px-4 py-12">
            <div className="mb-6 flex justify-between items-center">
              <button
                onClick={handleBackToEvent}
                className="flex items-center text-purple-300 hover:text-purple-200 transition-colors group"
              >
                <ChevronLeft size={20} className="mr-1 group-hover:-translate-x-1 transition-transform" />
                <span className="text-sm md:text-base">Back to Event</span>
              </button>
              
              {isLoading && meetingDetails && (
                <div className="bg-purple-600/80 text-white text-xs px-3 py-1.5 rounded-full flex items-center animate-pulse">
                  <RefreshCw size={12} className="mr-1.5 animate-spin" />
                  Refreshing...
                </div>
              )}
            </div>
            
            {isLoading && !meetingDetails ? (
              <div className="flex flex-col items-center justify-center py-20">
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="w-16 h-16 mb-6 text-purple-500"
                >
                  <Loader2 className="w-full h-full" />
                </motion.div>
                <p className="text-purple-300 text-xl font-medium">Loading your meeting details...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                {/* Left column - Event info */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="lg:col-span-2"
                >
                  <div className="bg-[#190d25]/60 backdrop-blur-md border border-[#b967ff]/20 rounded-2xl p-6 shadow-xl sticky top-4">
                    <h1 className="text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#b967ff] to-[#7d4bff] mb-3 leading-tight">
                      {eventTitle || "Event Details"}
                    </h1>
                    
                    {eventDate && (
                      <div className="flex flex-col space-y-2 text-gray-300 text-sm mb-5">
                        <p className="flex items-center">
                          <Calendar size={16} className="mr-2 text-[#b967ff]"/> 
                          {new Date(eventDate).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                        <p className="flex items-center">
                          <Clock size={16} className="mr-2 text-[#b967ff]"/> 
                          {new Date(eventDate).toLocaleTimeString(undefined, { hour: '2-digit', minute:'2-digit' })}
                        </p>
                      </div>
                    )}
                    
                    <div className="border-t border-[#b967ff]/10 pt-5 mt-2">
                      <h3 className="text-base font-semibold text-gray-200 mb-3 flex items-center">
                        <Ticket size={16} className="mr-2 text-[#b967ff]"/> 
                        Registration Details
                      </h3>
                      <div className="space-y-2 text-sm text-gray-300">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400">Name:</span>
                          <span className="font-medium text-white">{meetingDetails?.firstName} {meetingDetails?.lastName}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400">Email:</span>
                          <span className="font-medium text-white">{meetingDetails?.email}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400">Order ID:</span>
                          <span className="font-medium text-white text-xs">{meetingDetails?.orderId}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Share Menu - Now in left column */}
                    <div className="border-t border-[#b967ff]/10 pt-5 mt-5">
                      <h3 className="text-base font-semibold text-gray-200 mb-3">
                        Share & Tools
                      </h3>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="relative">
                          <button
                            onClick={() => setShowShareMenu(!showShareMenu)}
                            className="w-full p-2.5 bg-[#24123a]/80 hover:bg-[#331a53] rounded-lg transition-colors flex items-center justify-center text-sm gap-2"
                          >
                            <Share size={16} /> Share
                          </button>
                          <AnimatePresence>
                            {showShareMenu && (
                              <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="absolute bottom-full left-0 mb-2 w-48 bg-[#24123a] rounded-lg shadow-xl p-2 z-20"
                              >
                                {[
                                  { name: "Facebook", icon: Facebook, platform: "facebook" },
                                  { name: "Twitter", icon: Twitter, platform: "twitter" },
                                  { name: "LinkedIn", icon: Linkedin, platform: "linkedin" },
                                  { name: "Email", icon: Mail, platform: "email" },
                                ].map(item => (
                                  <button
                                    key={item.platform}
                                    onClick={() => handleShare(item.platform)}
                                    className="w-full flex items-center px-3 py-2 text-sm text-slate-200 hover:bg-[#b967ff]/30 rounded-md transition-colors gap-2"
                                  >
                                    <item.icon size={16} /> {item.name}
                                  </button>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                        
                        <button
                          onClick={requestNotificationPermissionAndSetReminder}
                          disabled={reminderSet || notificationPermission === 'denied'}
                          className={`p-2.5 rounded-lg transition-colors flex items-center justify-center text-sm gap-2
                                    ${reminderSet ? 'bg-[#b967ff]/30 text-[#b967ff] cursor-default' : 
                                     notificationPermission === 'denied' ? 'bg-red-500/20 text-red-300 cursor-not-allowed' : 
                                     'bg-[#24123a]/80 hover:bg-[#331a53]'}`}
                        >
                          <Bell size={16} /> {reminderSet ? "Reminded" : "Remind"}
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
                
                {/* Right column - Meeting controls */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  className="lg:col-span-3"
                >
                  {/* Countdown or Status section */}
                  <div className="bg-[#190d25]/60 backdrop-blur-md border border-[#b967ff]/20 rounded-2xl p-6 shadow-xl mb-6">
                    {meetingStarted ? (
                      <div className="text-center">
                        <motion.div
                          initial={{ scale: 0.9 }}
                          animate={{ scale: 1 }}
                          className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4"
                        >
                          <CheckCircle className="w-8 h-8 text-green-400" />
                        </motion.div>
                        <h2 className="text-xl md:text-2xl font-bold text-white mb-2">Meeting is Live!</h2>
                        <p className="text-gray-300 mb-6">This virtual event has started and is ready for you to join.</p>
                        
                        {isVirtual && meetingLink && (
                          <button
                            onClick={handleCopyLink}
                            className="inline-flex items-center justify-center px-4 py-2 bg-[#24123a] hover:bg-[#331a53] rounded-lg transition-colors text-sm gap-2"
                          >
                            {copied ? <CheckCircle size={16} className="text-green-400"/> : <Copy size={16} />} 
                            {copied ? "Copied!" : "Copy Meeting Link"}
                          </button>
                        )}
                      </div>
                    ) : timeLeft ? (
                      <div className="text-center">
                        <motion.div
                          initial={{ scale: 0.9 }}
                          animate={{ scale: 1 }}
                          className="w-16 h-16 bg-[#b967ff]/20 rounded-full flex items-center justify-center mx-auto mb-4"
                        >
                          <Clock className="w-8 h-8 text-[#b967ff]" />
                        </motion.div>
                        <h2 className="text-xl md:text-2xl font-bold text-white mb-4">Event Starts In:</h2>
                        <div className="flex justify-center">
                          <CountdownTimer />
                        </div>
                      </div>
                    ) : (
                      <div className="text-center">
                        <motion.div
                          initial={{ scale: 0.9 }}
                          animate={{ scale: 1 }}
                          className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4"
                        >
                          <AlertCircle className="w-8 h-8 text-yellow-400" />
                        </motion.div>
                        <h2 className="text-xl md:text-2xl font-bold text-white mb-2">Meeting Status Unknown</h2>
                        <p className="text-gray-300">Could not determine meeting start time.</p>
                      </div>
                    )}
                  </div>
                  
                  {/* Meeting join section */}
                  <div className="bg-[#190d25]/60 backdrop-blur-md border border-[#b967ff]/20 rounded-2xl p-6 shadow-xl">
                    <h2 className="text-xl font-bold text-white mb-4">Join Virtual Meeting</h2>
                    
                    {isVirtual ? (
                      meetingLink || roomName ? (
                        <div className="space-y-5">
                          {isVirtual && meetingPlatform === 'JITSI' && (
                            <button
                              onClick={handleOpenJitsiMeeting}
                              disabled={!canJoinMeetingBasis || isLoading || (!meetingStarted && !!eventDate)}
                              className={`w-full flex items-center justify-center gap-3 px-6 py-4 text-base font-semibold rounded-xl transition-all duration-300 ${
                                (!canJoinMeetingBasis || isLoading || (!meetingStarted && !!eventDate))
                                  ? 'bg-gray-600/50 text-gray-400 cursor-not-allowed'
                                  : 'bg-gradient-to-r from-[#b967ff] to-[#7d4bff] hover:from-[#a43dff] hover:to-[#6a3bc7] text-white shadow-lg hover:shadow-[#b967ff]/20'
                              }`}
                            >
                              {isLoading && <Loader2 className="animate-spin w-5 h-5" />}
                              {isLoading
                                ? 'Loading Meeting...'
                                : !canJoinMeetingBasis
                                ? 'Meeting Unavailable'
                                : meetingStarted || !eventDate
                                ? 'Join Meeting Now'
                                : 'Meeting Not Started Yet'}
                            </button>
                          )}
                          
                          {isVirtual && meetingLink && meetingPlatform !== 'JITSI' && (
                            <a
                              href={meetingLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`w-full flex items-center justify-center gap-3 px-6 py-4 text-base font-semibold rounded-xl transition-all duration-300 ${
                                (!meetingStarted && !!eventDate) 
                                  ? 'bg-gray-600/50 text-gray-400 cursor-not-allowed pointer-events-none' 
                                  : 'bg-gradient-to-r from-[#b967ff] to-[#7d4bff] hover:from-[#a43dff] hover:to-[#6a3bc7] text-white shadow-lg hover:shadow-[#b967ff]/20'
                              }`}
                            >
                              {(!meetingStarted && !!eventDate) ? 'Meeting Not Started Yet' : 'Join External Meeting'}
                              <ExternalLink size={18} />
                            </a>
                          )}
                          
                          <div className="p-4 bg-[#24123a]/50 rounded-xl border border-[#b967ff]/10">
                            <div className="flex items-start gap-3">
                              <div className="bg-[#b967ff]/20 p-2 rounded-lg">
                                <Info size={18} className="text-[#b967ff]" />
                              </div>
                              <div>
                                <h4 className="text-sm font-medium text-white mb-1">Meeting Information</h4>
                                <p className="text-xs text-gray-300">
                                  {meetingStarted 
                                    ? "This meeting is in progress. Join now to participate with other attendees." 
                                    : "The meeting will be available once the scheduled time arrives."}
                                </p>
                                {meetingPlatform && (
                                  <p className="text-xs text-gray-400 mt-1">
                                    Platform: {meetingPlatform === 'JITSI' ? 'Built-in Video' : meetingPlatform}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="p-6 bg-[#24123a]/50 border border-yellow-500/30 rounded-xl text-center">
                          <AlertCircle size={24} className="inline-block mb-2 text-yellow-400" />
                          <p className="text-yellow-300 font-medium mb-2">Meeting Link Missing</p>
                          <p className="text-gray-300 text-sm mb-4">The organizer has not provided a meeting link yet.</p>
                          <button
                            onClick={handleBackToEvent}
                            className="px-4 py-2 bg-[#331a53] hover:bg-[#442366] rounded-lg text-white transition-colors text-sm"
                          >
                            Back to Event Details
                          </button>
                        </div>
                      )
                    ) : (
                      <div className="p-6 bg-[#24123a]/50 rounded-xl">
                        <h3 className="text-lg font-semibold text-[#b967ff] mb-3 flex items-center">
                          <MapPin size={18} className="mr-2"/> 
                          Physical Event Location
                        </h3>
                        <p className="text-gray-200">
                          {meetingDetails?.location?.address 
                            ? formatLocation(meetingDetails.location)
                            : "No location information available"}
                        </p>
                      </div>
                    )}
                  </div>
                </motion.div>
              </div>
            )}
          </div>
        )}
      </main>
    </AnimatePresence>
  );
}