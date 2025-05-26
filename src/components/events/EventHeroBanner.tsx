"use client";

import React from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Calendar, MapPin } from "lucide-react";
import type { Event } from "@/types/event";

const DEFAULT_EVENT_IMAGE = "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&q=80";

// Helper function to check if URL is from Unsplash
const isUnsplashUrl = (url: string) => {
  if (!url) return false;
  return url.includes('images.unsplash.com');
};

// Helper function to determine if Next.js image optimization should be skipped
const shouldSkipOptimization = (url: string) => {
  if (!url) return true; // Don't optimize if no URL
  if (url.startsWith('/')) return false; // Optimize local images
  if (isUnsplashUrl(url)) return true; // Skip Unsplash
  // Skip other common placeholder/avatar services
  return url.includes('api.dicebear.com') || 
         url.includes('i.pravatar.cc') || 
         url.includes('picsum.photos');
};

interface EventHeroBannerProps {
  event: Event;
}

export default function EventHeroBanner({ event }: EventHeroBannerProps) {
  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Helper to display the location text
  const getLocationText = () => {
    if (typeof event.location === 'string') {
      return event.location;
    }
    if (event.location && typeof event.location === 'object') {
      return event.location.address || 'Location details available';
    }
    return 'Location TBA';
  };

  const imageUrl = event.coverImage?.url || event.image || DEFAULT_EVENT_IMAGE;
  const showImage = imageUrl && imageUrl !== DEFAULT_EVENT_IMAGE;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="relative w-full h-[40vh] sm:h-[45vh] md:h-[50vh] lg:h-[60vh] min-h-[300px] max-h-[700px] mb-4 sm:mb-6 md:mb-8"
    >
      {/* Hero Image */}
      <div className="absolute inset-0 overflow-hidden">
        {showImage ? (
          <Image
            src={imageUrl}
            alt={event.title || "Event image"}
            priority
            fill
            className="object-cover"
            sizes="100vw"
            unoptimized={shouldSkipOptimization(imageUrl)}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#2D1D3A] via-[#1A0D25] to-[#120a19]" />
        )}
        
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#120a19] via-[#120a19]/80 to-transparent" />
        
        {/* Animated light effect */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ 
            opacity: [0.1, 0.3, 0.1], 
            scale: [1, 1.1, 1],
          }}
          transition={{ 
            repeat: Infinity, 
            duration: 8,
            ease: "easeInOut" 
          }}
          className="absolute top-[20%] right-[20%] w-[200px] h-[200px] sm:w-[250px] sm:h-[250px] md:w-[300px] md:h-[300px] rounded-full bg-[#b967ff]/20 blur-[100px]"
        />
      </div>
      
      {/* Content */}
      <div className="h-full flex flex-col justify-end pb-6 sm:pb-8 md:pb-12 px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="max-w-full overflow-hidden"
        >
          {event.category && (
            <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-[#b967ff]/20 text-[#d9a6ff] border border-[#b967ff]/30 mb-2 sm:mb-3">
              {event.category}
            </span>
          )}
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-2 sm:mb-4 max-w-4xl drop-shadow-md break-words">
            {event.title || "Untitled Event"}
          </h1>
          
          <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-300">
            {event.date && (
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3 sm:w-4 sm:h-4 text-[#b967ff]" />
                <span>{formatDate(event.date)}</span>
              </div>
            )}
            
            {event.location && (
              <div className="flex items-center gap-1">
                <MapPin className="w-3 h-3 sm:w-4 sm:h-4 text-[#b967ff]" />
                <span className="truncate max-w-[150px] sm:max-w-[200px] md:max-w-none">{getLocationText()}</span>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
} 