// "use client";

// import React, { useState, useEffect, useCallback } from "react";
// import { motion } from "framer-motion";
// import { Users, User, CheckCircle, RefreshCw } from "lucide-react";
// import type { Event } from "@/types/event";

// // Extended interface to include optional properties added by the API
// interface ExtendedEvent extends Event {
//   isRegistered?: boolean;
//   isOwner?: boolean;
//   userOrderId?: string;
//   registeredCount?: number;
// }

// interface CapacitySectionProps {
//   event: ExtendedEvent;
// }

// interface AttendeeResponse {
//   success: boolean;
//   attendeeCount: number;
//   isRegistered: boolean;
//   isOwner: boolean;
//   eventId: string;
// }

// export default function CapacitySection({ event }: CapacitySectionProps) {
//   console.log("CapacitySection RENDER - Event:", 
//     JSON.stringify({
//       id: event._id,
//       attendees: event.attendees,
//       registeredCount: event.registeredCount,
//       isRegistered: event.isRegistered
//     })
//   );

//   // Track component mount status to prevent state updates after unmount
//   const [isMounted, setIsMounted] = useState(false);

//   const [attendeeCount, setAttendeeCount] = useState<number>(0);
//   const [isRegistered, setIsRegistered] = useState<boolean>(false);
//   const [isLoading, setIsLoading] = useState<boolean>(true);
//   const [error, setError] = useState<string | null>(null);
//   const [lastUpdated, setLastUpdated] = useState<number>(Date.now());

//   // Initialize state from props in a separate effect to ensure we only do this once
//   useEffect(() => {
//     console.log("Initial state setup effect running");
//     setIsMounted(true);
    
//     // Use the best available initial value from props
//     const initialCount = 
//       typeof event.registeredCount === 'number' 
//         ? event.registeredCount 
//         : typeof event.attendees === 'number'
//           ? event.attendees
//           : 0;
    
//     console.log(`Setting initial attendee count: ${initialCount}`);
//     setAttendeeCount(initialCount);
//     setIsRegistered(!!event.isRegistered);
    
//     return () => {
//       // Cleanup to prevent state updates after unmount
//       setIsMounted(false);
//     };
//   }, []);

//   // Fetch the latest attendee count from dedicated API
//   const fetchAttendeeCount = useCallback(async () => {
//     if (!isMounted) return;
    
//     console.log(`fetchAttendeeCount called for event ${event._id}`);
//     setIsLoading(true);
//     setError(null);
    
//     try {
//       console.log(`Making API request to /api/events/${event._id}/attendees`);
      
//       const timestamp = new Date().getTime();
//       const response = await fetch(`/api/events/${event._id}/attendees?t=${timestamp}`, {
//         // Add cache control to prevent browser caching
//         headers: {
//           'Cache-Control': 'no-cache, no-store, must-revalidate',
//           'Pragma': 'no-cache',
//           'Expires': '0'
//         },
//         // Bypass cache completely
//         cache: 'no-store'
//       });
      
//       if (!response.ok) {
//         const errorData = await response.json();
//         throw new Error(errorData.error || "Failed to fetch attendance data");
//       }
      
//       const data: AttendeeResponse = await response.json();
//       console.log('API Response data:', JSON.stringify(data));
      
//       if (!isMounted) {
//         console.log('Component unmounted, skipping state update');
//         return;
//       }
      
//       if (data.success) {
//         console.log(`Setting attendee count: ${data.attendeeCount}, isRegistered: ${data.isRegistered}`);
//         setAttendeeCount(data.attendeeCount);
//         setIsRegistered(data.isRegistered);
//         setLastUpdated(Date.now());
//       } else {
//         throw new Error("Response indicated failure");
//       }
//     } catch (err) {
//       console.error("Error fetching attendance:", err);
//       if (isMounted) {
//         setError(err instanceof Error ? err.message : "Unknown error");
//       }
//     } finally {
//       if (isMounted) {
//         setIsLoading(false);
//       }
//     }
//   }, [event._id, isMounted]);
  
//   // Fetch data on initial load and when event ID changes
//   useEffect(() => {
//     console.log(`Data fetch effect running for event: ${event._id}`);
//     if (isMounted) {
//       fetchAttendeeCount();
//     }
//   }, [event._id, fetchAttendeeCount, isMounted]);
  
//   // Calculate capacity percentage
//   const getCapacityPercentage = () => {
//     if (!event.maxAttendees || event.maxAttendees === 0) return 0;
//     return Math.min(100, Math.round((attendeeCount / event.maxAttendees) * 100));
//   };
  
//   // Get the capacity status text
//   const getCapacityStatusText = () => {
//     if (!event.maxAttendees) return "Unlimited capacity";
    
//     const percentage = getCapacityPercentage();
//     const remaining = event.maxAttendees - attendeeCount;
    
//     if (percentage >= 100) return "Event is full";
//     if (percentage >= 90) return `Almost full! Only ${remaining} ${remaining === 1 ? 'spot' : 'spots'} left`;
//     if (percentage >= 75) return `Filling up! ${remaining} ${remaining === 1 ? 'spot' : 'spots'} left`;
//     if (percentage >= 50) return `Going fast! ${remaining} ${remaining === 1 ? 'spot' : 'spots'} left`;
//     return `${remaining} ${remaining === 1 ? 'spot' : 'spots'} available`;
//   };
  
//   // Determine progress bar color based on capacity
//   const getProgressBarColor = () => {
//     const percentage = getCapacityPercentage();
//     if (percentage >= 90) return "bg-red-500";
//     if (percentage >= 75) return "bg-amber-500";
//     if (percentage >= 50) return "bg-green-500";
//     return "bg-[#b967ff]";
//   };

//   // Check if capacity info is available
//   const hasCapacityInfo = event.maxAttendees !== undefined;

//   console.log(`Rendering capacity section - Count: ${attendeeCount}, Registered: ${isRegistered}, Loading: ${isLoading}`);

//   return (
//     <motion.div
//       initial={{ opacity: 0, y: 20 }}
//       animate={{ opacity: 1, y: 0 }}
//       transition={{ delay: 0.5 }}
//       key={`capacity-${lastUpdated}`} // Force re-render when data updates
//     >
//       <h3 className="text-white text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center gap-2">
//         <Users className="w-4 h-4 sm:w-5 sm:h-5 text-[#b967ff]" />
//         Attendance
//       </h3>
      
//       <div className="bg-[#1A0D25]/70 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-[#b967ff]/10 relative overflow-hidden">
//         {/* Background decoration */}
//         <div className="absolute -top-10 -right-10 w-24 h-24 bg-[#b967ff]/10 rounded-full blur-xl"></div>
        
//         <div className="flex items-start gap-3 relative">
//           <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-[#b967ff]/10 flex items-center justify-center border border-[#b967ff]/20 shrink-0">
//             <Users className="w-5 h-5 sm:w-6 sm:h-6 text-[#b967ff]" />
//           </div>
          
//           <div className="w-full min-w-0">
//             {/* Debug info - remove in production */}
//             <div className="text-amber-500 text-xs mb-1 bg-amber-950/20 p-1 rounded">
//               API count: {attendeeCount} | Event.attendees: {event.attendees} | Loading: {isLoading ? "yes" : "no"}
//             </div>
            
//             {/* Attendance count with visual indicator */}
//             <div className="flex justify-between items-center">
//               <div className="text-white text-sm sm:text-base font-medium flex items-center gap-2">
//                 {hasCapacityInfo ? (
//                   <span className="flex items-center">
//                     <span className="inline-flex items-center font-semibold text-base sm:text-lg mr-1">
//                       {attendeeCount}
//                     </span> 
//                     / {event.maxAttendees} 
//                     <span className="ml-1 text-gray-300">attendees</span>
                    
//                     {/* Refresh button */}
//                     <button 
//                       onClick={(e) => {
//                         e.stopPropagation();
//                         console.log("Refresh button clicked");
//                         fetchAttendeeCount();
//                       }}
//                       disabled={isLoading}
//                       aria-label="Refresh attendee count"
//                       className="ml-2 p-1 rounded-full bg-[#b967ff]/10 hover:bg-[#b967ff]/20 transition-colors"
//                     >
//                       <RefreshCw className={`w-3.5 h-3.5 text-[#b967ff] ${isLoading ? 'animate-spin' : ''}`} />
//                     </button>
//                   </span>
//                 ) : (
//                   <span>
//                     <span className="font-semibold text-base sm:text-lg">{attendeeCount}</span> attendees
                    
//                     {/* Refresh button */}
//                     <button 
//                       onClick={(e) => {
//                         e.stopPropagation();
//                         console.log("Refresh button clicked");
//                         fetchAttendeeCount();
//                       }}
//                       disabled={isLoading}
//                       aria-label="Refresh attendee count"
//                       className="ml-2 p-1 rounded-full bg-[#b967ff]/10 hover:bg-[#b967ff]/20 transition-colors"
//                     >
//                       <RefreshCw className={`w-3.5 h-3.5 text-[#b967ff] ${isLoading ? 'animate-spin' : ''}`} />
//                     </button>
//                   </span>
//                 )}
//               </div>
              
//               {isRegistered && (
//                 <motion.div 
//                   initial={{ scale: 0.8, opacity: 0 }}
//                   animate={{ scale: 1, opacity: 1 }}
//                   transition={{ delay: 0.8 }}
//                   className="bg-green-900/30 text-green-300 text-xs px-2 py-1 rounded-full flex items-center gap-1 border border-green-500/20"
//                 >
//                   <CheckCircle className="w-3 h-3" /> Registered
//                 </motion.div>
//               )}
//             </div>
            
//             {/* Error message */}
//             {error && (
//               <p className="text-red-400 text-xs mt-1">
//                 {error}
//               </p>
//             )}
            
//             {hasCapacityInfo && (
//               <>
//                 <div className="text-gray-400 text-xs sm:text-sm mt-1">
//                   {getCapacityStatusText()}
//                 </div>
                
//                 <div className="mt-3 w-full bg-gray-800 rounded-full h-2 overflow-hidden relative">
//                   <motion.div 
//                     initial={{ width: 0 }}
//                     animate={{ width: `${getCapacityPercentage()}%` }}
//                     transition={{ duration: 1, delay: 0.6, ease: "easeOut" }}
//                     className={`h-full ${getProgressBarColor()}`}
//                     key={`progress-${attendeeCount}`} // Force re-render when count changes
//                   />
                  
//                   {/* Minimum attendees marker */}
//                   {event.minimumAttendees && event.maxAttendees && (
//                     <motion.div 
//                       initial={{ opacity: 0 }}
//                       animate={{ opacity: 1 }}
//                       transition={{ delay: 1 }}
//                       className="absolute top-0 h-full w-0.5 bg-white/60"
//                       style={{ 
//                         left: `${Math.min(100, (event.minimumAttendees / event.maxAttendees) * 100)}%`,
//                         boxShadow: '0 0 3px rgba(255,255,255,0.7)' 
//                       }}
//                     >
//                       <div className="absolute -top-1.5 -left-1 w-2 h-2 rounded-full bg-white"></div>
//                     </motion.div>
//                   )}
//                 </div>
                
//                 {/* Visual capacity indicators */}
//                 <div className="flex justify-between mt-1.5 text-xs text-gray-400">
//                   <div>0</div>
//                   <div>{event.maxAttendees}</div>
//                 </div>
//               </>
//             )}
            
//             {/* Minimum attendees info with better styling */}
//             {event.minimumAttendees && (
//               <div className="text-gray-400 text-xs mt-3 flex items-center gap-1.5 border-t border-[#b967ff]/10 pt-2">
//                 <User className="w-3.5 h-3.5 text-amber-500" />
//                 <span>
//                   Minimum required: <span className="text-amber-400 font-medium">{event.minimumAttendees}</span> attendees
//                 </span>
//               </div>
//             )}
//           </div>
//         </div>
//       </div>
//     </motion.div>
//   );
// } 