"use client";

import React, { useState, useMemo, useCallback } from "react";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { useRouter } from 'next/navigation';
import { Calendar, MapPin, CreditCard, User, Tag, ChevronRight, Clock, Users, ImageOff, Loader2 } from "lucide-react";
import type { Event } from "../../types/event";
import { motion, AnimatePresence } from "framer-motion";
import { format, parseISO } from 'date-fns';
interface EventCardProps {
  event: Event;
  isAuthenticated: boolean;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}

const EventCard: React.FC<EventCardProps> = ({ event, isAuthenticated, onEdit, onDelete }) => {
  const { data: session } = useSession();
  const [isHovered, setIsHovered] = useState(false);
  const [isNavigatingToSignIn, setIsNavigatingToSignIn] = useState(false);
  const router = useRouter();

  const formatDate = (dateString: string | undefined | null): string => {
    if (!dateString) return 'Date TBA';
    try {
      const date = parseISO(dateString);
      return format(date, 'PPPP');
    } catch (e) {
      return 'Invalid Date';
    }
  };

  const formatTime = (dateString: string | undefined | null): string => {
    if (!dateString) return 'Time TBA';
    try {
      const date = parseISO(dateString);
      return format(date, 'p');
    } catch (e) {
      return 'Invalid Time';
    }
  };

  const formatPrice = (price?: number | null) => {
    if (price === undefined || price === null) return "Free";
    return price === 0 ? "Free" : `$${price.toFixed(2)}`;
  };

  const getLocationString = (eventData: Event) => {
    const { location, isVirtual } = eventData;

    if (isVirtual && (!location || (!location.address && !location.city))) {
      // If it's virtual AND has no meaningful physical location details
      return "Virtual Event";
    }

    if (!location) return "Location TBA";

    // location is confirmed to be an EventLocation object here (or was handled by !location)
    // The `typeof location === "string"` check is removed as it's not possible based on EventType.

    // Handle object location
    const address = location.address?.trim();
    const city = location.city?.trim();
    const country = location.country?.trim();

    if (address) return address;
    if (city && country) return `${city}, ${country}`;
    if (city) return city;
    if (country) return country; // Less likely to be useful alone, but a fallback

    // If it's virtual and we reached here, it means it's hybrid with some physical aspect not yet captured
    // but the primary display for cards should be its primary mode if no specific physical address.
    if (isVirtual) return "Virtual Event (Hybrid)"; // Or just "Hybrid Event"

    return "Location TBA";
  };

  const getEventImage = (eventData: Event) => {
    if (eventData.coverImage?.url) return eventData.coverImage.url;
    if (eventData.image) return eventData.image;
    return null;
  };

  const locationString = useMemo(() => getLocationString(event), [event]);

  const imageUrl = useMemo(() => getEventImage(event), [event]);

  const expired = useMemo(() => {
    if (!event.date) return false;
    
    // Use same grace period logic as events page
    const now = new Date();
    const graceTime = new Date(now);
    graceTime.setHours(graceTime.getHours() - 24); // Consider expired only if ended > 24h ago

    const eventDate = new Date(event.date);
    let comparisonTime: Date | null = eventDate;
    
    if (event.endDate) {
      const endDate = new Date(event.endDate);
      comparisonTime = endDate;
    } else if (event.duration && typeof event.duration === 'number') {
      const endTime = new Date(eventDate.getTime() + (event.duration * 60 * 1000));
      comparisonTime = endTime;
    }
    
    // If comparisonTime is null (shouldn't happen if event.date exists), treat as not expired
    return comparisonTime ? comparisonTime < graceTime : false;
  }, [event.date, event.endDate, event.duration]);

  const timeUntil = useMemo(() => {
    if (!event.date) return null;
    
    const now = new Date();
    const eventDate = new Date(event.date);
    
    if (eventDate < now) return null;
    
    const diffTime = Math.abs(eventDate.getTime() - now.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      // Today
      const diffHours = Math.floor((diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      if (diffHours === 0) {
        const diffMinutes = Math.floor((diffTime % (1000 * 60 * 60)) / (1000 * 60));
        return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} from now`;
      }
      return `${diffHours} hour${diffHours === 1 ? '' : 's'} from now`;
    } else if (diffDays === 1) {
      return 'Tomorrow';
    } else if (diffDays < 7) {
      return `${diffDays} days from now`;
    } else if (diffDays < 30) {
      const diffWeeks = Math.floor(diffDays / 7);
      return `${diffWeeks} week${diffWeeks === 1 ? '' : 's'} from now`;
    } else {
      return formatDate(event.date);
    }
  }, [event.date]);

  const handleEdit = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (onEdit) onEdit(event._id);
  }, [onEdit, event._id]);
  
  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (onDelete) onDelete(event._id);
  }, [onDelete, event._id]);

  const handleCardClick = useCallback(() => {
    if (!isAuthenticated) {
      router.push('/auth/signin');
    } else {
      router.push(`/events/${event._id}`);
    }
  }, [isAuthenticated, router, event._id]);

  // Handler for the view details button
  const handleDetailsButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click handler
    if (!isAuthenticated) {
      setIsNavigatingToSignIn(true);
      router.push('/auth/signin');
    } else {
      router.push(`/events/${event._id}`);
    }
  };
  
  // Get attendance count for display
  const attendanceCount = useMemo(() => {
    if (event.attendees && Array.isArray(event.attendees)) {
      return event.attendees.length;
    } else if (
      event.metadata && 
      typeof event.metadata === 'object' && 
      'attendeeCount' in event.metadata &&
      typeof event.metadata.attendeeCount === 'number'
    ) {
      return event.metadata.attendeeCount;
    }
    return 0;
  }, [event]);

  return (
      <motion.div
      onClick={handleCardClick}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ 
          y: -8, 
          boxShadow: '0 20px 40px -12px rgba(185, 103, 255, 0.4)',
          scale: 1.02
        }}
        transition={{ duration: 0.3 }}
        className={`group block bg-[#120a19]/70 backdrop-blur-sm border border-[#b967ff]/10 
                  hover:border-[#b967ff]/40 rounded-xl overflow-hidden transition-all duration-300 shadow-lg cursor-pointer`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Enhanced Hero Image with dynamic lighting effects */}
        <div className="relative h-48 sm:h-52 md:h-64 w-full overflow-hidden">
          {imageUrl && typeof imageUrl === 'string' && imageUrl.trim() !== "" ? (
              <>
                <Image
                  src={imageUrl}
                  alt={event.title}
                  fill
                  className="object-cover transform group-hover:scale-110 transition-transform duration-700 ease-out"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                />
                
                {/* Animated gradient overlay */}
                <motion.div 
                  animate={{ 
                    background: isHovered 
                      ? 'linear-gradient(to top, rgba(18, 10, 25, 0.95) 0%, rgba(18, 10, 25, 0.8) 30%, rgba(18, 10, 25, 0.4) 60%, rgba(18, 10, 25, 0.2) 100%)' 
                      : 'linear-gradient(to top, rgba(18, 10, 25, 0.95) 0%, rgba(18, 10, 25, 0.7) 50%, rgba(18, 10, 25, 0.4) 100%)'
                  }}
                  transition={{ duration: 0.5 }}
                  className="absolute inset-0"
                ></motion.div>
                
                {/* Animated spotlight effect on hover */}
                <AnimatePresence>
                  {isHovered && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 0.2 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.5 }}
                      className="absolute inset-0"
                      style={{ 
                        background: "radial-gradient(circle at center, rgba(185, 103, 255, 0.4) 0%, transparent 70%)",
                      }}
                    ></motion.div>
                  )}
                </AnimatePresence>
                
                {/* Category label with improved styling */}
                {event.category && (
                  <motion.div 
                    animate={{ 
                      y: isHovered ? -3 : 0,
                      scale: isHovered ? 1.05 : 1
                    }}
                    className="absolute top-4 left-4 z-10"
                  >
                    <span className="inline-block bg-[#b967ff]/90 backdrop-blur-md text-white text-xs px-3 py-1.5 rounded-full font-medium shadow-lg shadow-[#b967ff]/20 border border-[#b967ff]/50">
                      {event.category}
                    </span>
                  </motion.div>
                )}
                
                {/* Expired badge with improved styling */}
                {expired && (
                  <motion.div 
                    animate={{ 
                      y: isHovered ? -3 : 0,
                      scale: isHovered ? 1.05 : 1
                    }}
                    className="absolute top-4 right-4 z-10"
                  >
                    <span className="inline-block bg-red-500/90 backdrop-blur-md text-white text-xs px-3 py-1.5 rounded-full font-medium shadow-lg shadow-red-500/20 border border-red-500/50">
                      Expired
                    </span>
                  </motion.div>
                )}
              </>
            ) : (
              <div className="h-full w-full bg-gradient-to-br from-[#1A0D25] to-[#120a19] flex items-center justify-center">
                <ImageOff className="h-16 w-16 text-[#b967ff]/20" />
              </div>
            )}
          
          {/* Upcoming event badge */}
          {!expired && timeUntil && (
            <motion.div 
              animate={{ 
                y: isHovered ? -3 : 0,
                scale: isHovered ? 1.05 : 1
              }}
              className="absolute top-4 right-4 z-10"
            >
              <span className="inline-block bg-teal-500/90 backdrop-blur-md text-white text-xs px-3 py-1.5 rounded-full font-medium shadow-lg shadow-teal-500/20 border border-teal-500/50">
                {timeUntil}
              </span>
            </motion.div>
            )}
        </div>

        <div className="p-6 relative">
          {/* Date & Time Badge */}
          <motion.div 
            animate={{ y: isHovered ? -5 : 0 }}
            className="absolute -top-5 left-6 bg-[#2A1151]/90 backdrop-blur-md border border-[#b967ff]/30 rounded-lg px-3 py-2 shadow-lg shadow-[#b967ff]/10 flex items-center space-x-2"
          >
            <Calendar className="h-4 w-4 text-[#b967ff]" />
            <span className="text-white text-xs font-medium">
              {formatDate(event.date)}
            </span>
            {/* Only show time if we have a valid date */}
            {event.date && (
              <>
                <span className="text-gray-400">•</span>
                <span className="text-gray-200 text-xs">{formatTime(event.date)}</span>
              </>
            )}
          </motion.div>
          
          {/* Title and description */}
          <div className="mt-4">
            <motion.h3 
              animate={{ color: isHovered ? '#b967ff' : '#ffffff' }}
              transition={{ duration: 0.3 }}
              className="text-xl sm:text-2xl font-bold leading-tight line-clamp-2 transition-colors duration-300"
          >
              {event.title}
            </motion.h3>
            <div className="mt-2 text-sm text-gray-300 line-clamp-2 h-10">
              {event.shortDescription || event.description}
            </div>
          </div>

          {/* Info Grid with improved visuals */}
          <div className="grid grid-cols-2 gap-4 mt-5">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 bg-[#b967ff]/10 rounded-full">
                <MapPin className="h-3.5 w-3.5 text-[#b967ff]" />
              </div>
              <span className="text-gray-300 text-sm line-clamp-1 text-ellipsis overflow-hidden">
                {locationString}
              </span>
            </div>
            
            <div className="flex items-center space-x-2">
              <div className="p-1.5 bg-[#b967ff]/10 rounded-full">
                <Users className="h-3.5 w-3.5 text-[#b967ff]" />
              </div>
              <span className="text-gray-300 text-sm">
                {attendanceCount > 0 ? 
                  `${attendanceCount}${event.maxAttendees ? ` / ${event.maxAttendees}` : ''} attendee${attendanceCount !== 1 ? 's' : ''}` : 
                  `0${event.maxAttendees ? ` / ${event.maxAttendees}` : ''} attendees`}
              </span>
            </div>
            
            <div className="flex items-center space-x-2">
              <div className="p-1.5 bg-[#b967ff]/10 rounded-full">
                <CreditCard className="h-3.5 w-3.5 text-[#b967ff]" />
              </div>
              <span className="text-gray-300 text-sm">{formatPrice(event.price)}</span>
            </div>
            
            {event.skillLevel && (
              <div className="flex items-center space-x-2">
                <div className="p-1.5 bg-[#b967ff]/10 rounded-full">
                  <Tag className="h-3.5 w-3.5 text-[#b967ff]" />
            </div>
                <span className="text-gray-300 text-sm capitalize">{event.skillLevel}</span>
              </div>
            )}
          </div>

          {/* View Details Button with enhanced hover effects */}
          <motion.button
            onClick={handleDetailsButtonClick}
            className="mt-6 w-full py-3 bg-gradient-to-r from-[#b967ff]/10 to-[#b967ff]/25 
                     hover:from-[#b967ff]/20 hover:to-[#b967ff]/40
                     border border-[#b967ff]/30 hover:border-[#b967ff]/70
                     rounded-lg text-white font-medium
                     transition-all duration-300 shadow-md hover:shadow-[#b967ff]/20
                     flex items-center justify-center space-x-2 overflow-hidden relative"
            whileHover={{ y: -3 }}
            whileTap={{ y: 0 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {/* Animated background on hover */}
            {isHovered && (
              <motion.div 
                className="absolute inset-0 bg-gradient-to-r from-[#b967ff]/0 via-[#b967ff]/20 to-[#b967ff]/0"
                initial={{ x: '-100%' }}
                animate={{ x: '200%' }}
                transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
              />
            )}
            <span className="relative z-10">View Details</span>
            <ChevronRight className="h-4 w-4 relative z-10" />
            {isNavigatingToSignIn && (
              <div className="absolute inset-0 flex items-center justify-center bg-[#1A0D25]/80 rounded-lg z-20">
                <Loader2 className="h-6 w-6 text-white animate-spin" />
              </div>
            )}
          </motion.button>
        </div>
      </motion.div>
  );
};

export default React.memo(EventCard);
