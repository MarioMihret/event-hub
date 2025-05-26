"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { MapPin, Globe, Lock, Link2, Building } from "lucide-react";
import Link from "next/link";
import type { Event } from "@/types/event";

interface LocationSectionProps {
  event: Event;
  isRegistered?: boolean;
  userOrderId?: string;
  isOwner?: boolean;
}

export default function LocationSection({ event, isRegistered, userOrderId, isOwner }: LocationSectionProps) {
  // const [hasPaid, setHasPaid] = useState(false); // Removed
  
  // useEffect for hasPaid removed

  const hasPhysicalLocation = event.location && (typeof event.location === 'string' || (typeof event.location === 'object' && (event.location.address || event.location.city)));
  const isHybrid = event.isVirtual && hasPhysicalLocation;

  // Helper to render Virtual Info
  const renderVirtualInfo = () => {
    if (!event.isVirtual) return null;
    
    return (
      <div className={`mb-4 ${isHybrid ? 'pb-4 border-b border-[#b967ff]/10' : ''}`}>
        <div className="flex items-center gap-2 mb-2">
          <Globe className="w-4 h-4 text-[#b967ff] flex-shrink-0" />
          <span className="text-white text-sm sm:text-base font-medium">
            {isHybrid ? "Online Access Available" : "Virtual Event"}
          </span>
        </div>
        
        {isOwner ? (
          <Link
            href={`/payments/meeting?eventId=${event._id}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 mt-1 bg-green-600/20 text-green-300 rounded-lg text-xs sm:text-sm hover:bg-green-600/30 transition-colors ml-6"
          >
            <Link2 className="w-3 h-3" />
            Access Your Virtual Event
          </Link>
        ) : isRegistered && userOrderId ? (
          <Link
            href={`/payments/meeting?eventId=${event._id}&orderId=${userOrderId}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 mt-1 bg-[#b967ff]/10 text-[#b967ff] rounded-lg text-xs sm:text-sm hover:bg-[#b967ff]/20 transition-colors ml-6"
          >
            <Link2 className="w-3 h-3" />
            View Meeting Access
          </Link>
        ) : event.meetingLink ? (
          <div className="text-gray-400 text-sm mt-1 pl-6">
            Access details will be available via the main action buttons upon registration/purchase.
          </div>
        ) : (
          <div className="text-gray-400 text-sm mt-1 pl-6">
            Meeting details will be provided upon registration/purchase via the main action buttons.
          </div>
        )}
      </div>
    );
  };
  
  // Helper to render Physical Location Info
  const renderPhysicalInfo = () => {
    if (!hasPhysicalLocation) return null;
    
    let displayAddress = "Location TBA";
    let mapQuery = "";
    let cityCountry = "";

    if (typeof event.location === 'string') {
      displayAddress = event.location;
      mapQuery = event.location;
    } else if (event.location && typeof event.location === 'object') {
      displayAddress = event.location.address || displayAddress;
      mapQuery = event.location.address || [event.location.city, event.location.country].filter(Boolean).join(', ');
      if (event.location.city && event.location.country) {
        cityCountry = `${event.location.city}, ${event.location.country}`;
      }
    }

    return (
      <div>
        <div className="flex items-center gap-2 mb-2">
          <MapPin className="w-4 h-4 text-[#b967ff] flex-shrink-0" />
          <span className="text-white text-sm sm:text-base font-medium">
            {isHybrid ? "Physical Location" : "Location"}
          </span>
        </div>
        <div className="pl-6">
          <div className="text-white text-sm sm:text-base font-medium break-words">
            {displayAddress}
          </div>
          {cityCountry && (
            <div className="text-gray-400 text-xs sm:text-sm mt-1 break-words">
              {cityCountry}
            </div>
          )}
          {mapQuery && (
            <Link
              href={`https://maps.google.com/?q=${encodeURIComponent(mapQuery)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 mt-2 sm:mt-3 bg-[#b967ff]/10 text-[#b967ff] rounded-lg text-xs sm:text-sm hover:bg-[#b967ff]/20 transition-colors"
            >
              <MapPin className="w-3 h-3" />
              View on map
            </Link>
          )}
        </div>
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
    >
      <h3 className="text-white text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center gap-2">
        {isHybrid ? (
          <Building className="w-4 h-4 sm:w-5 sm:h-5 text-[#b967ff]" />
        ) : event.isVirtual ? (
          <Globe className="w-4 h-4 sm:w-5 sm:h-5 text-[#b967ff]" />
        ) : (
          <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-[#b967ff]" />
        )}
        {isHybrid ? "Event Format" : event.isVirtual ? "Virtual Meeting" : "Location"}
      </h3>
      
      <div className="bg-[#1A0D25]/70 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-[#b967ff]/10">
        {renderVirtualInfo()}
        
        {renderPhysicalInfo()}
        
        {!event.isVirtual && !hasPhysicalLocation && (
          <div className="text-gray-400 text-sm sm:text-base pl-6">Location not specified</div>
        )}
      </div>
    </motion.div>
  );
} 