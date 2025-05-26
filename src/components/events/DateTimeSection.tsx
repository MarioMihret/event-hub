"use client";

import React from "react";
import { motion } from "framer-motion";
import { Calendar, Clock } from "lucide-react";
import type { Event } from "@/types/event";
import { format, parseISO } from 'date-fns';

interface DateTimeSectionProps {
  event: Event;
}

export default function DateTimeSection({ event }: DateTimeSectionProps) {
  // Format date and time using date-fns
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "Date TBA";
    try {
      const date = parseISO(dateString);
      return format(date, 'PPPP');
    } catch (e) {
      console.error("Error formatting date:", dateString, e);
      return "Invalid Date";
    }
  };
  
  const formatTime = (dateString: string | undefined) => {
    if (!dateString) return "Time TBA";
    try {
      const date = parseISO(dateString);
      return format(date, 'p');
    } catch (e) {
      console.error("Error formatting time:", dateString, e);
      return "Invalid Time";
    }
  };
  
  // Calculate duration text
  const getDurationText = () => {
    if (event.endDate && event.date) {
      try {
        const startDate = parseISO(event.date);
        const endDate = parseISO(event.endDate);
      const diffMs = endDate.getTime() - startDate.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      
      if (diffHours < 24) {
        return `${diffHours} hour${diffHours !== 1 ? 's' : ''}`;
      } else {
        const diffDays = Math.floor(diffHours / 24);
        return `${diffDays} day${diffDays !== 1 ? 's' : ''}`;
      }
      } catch (e) { return "Invalid duration"; }
    }
    
    if (event.duration) {
      const hours = Math.floor(event.duration / 60);
      const minutes = event.duration % 60;
      
      if (hours === 0) {
        return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
      } else if (minutes === 0) {
        return `${hours} hour${hours !== 1 ? 's' : ''}`;
      } else {
        return `${hours} hour${hours !== 1 ? 's' : ''} ${minutes} minute${minutes !== 1 ? 's' : ''}`;
      }
    }
    
    return "Duration not specified";
  };

  // Ensure event.date is passed to formatDate and formatTime
  const displayDate = formatDate(event.date);
  const displayEndDate = event.endDate ? formatDate(event.endDate) : null;
  const displayTime = formatTime(event.date);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
    >
      <h3 className="text-white text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center gap-2">
        <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-[#b967ff]" />
        Date & Time
      </h3>
      
      <div className="bg-[#1A0D25]/70 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-[#b967ff]/10">
        {event.date ? (
          <div className="space-y-4 sm:space-y-6">
            {/* Date */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-[#b967ff]/10 flex items-center justify-center border border-[#b967ff]/20 shrink-0">
                <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-[#b967ff]" />
              </div>
              
              <div className="min-w-0 flex-1">
                <div className="text-white text-sm sm:text-base font-medium">Date</div>
                <div className="text-gray-300 text-sm sm:text-base mt-1 break-words">
                  {displayDate}
                </div>
                
                {displayEndDate && (
                  <div className="text-gray-400 text-xs sm:text-sm mt-1 break-words">
                    Until {displayEndDate}
                  </div>
                )}
              </div>
            </div>
            
            {/* Time */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-[#b967ff]/10 flex items-center justify-center border border-[#b967ff]/20 shrink-0">
                <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-[#b967ff]" />
              </div>
              
              <div className="min-w-0 flex-1">
                <div className="text-white text-sm sm:text-base font-medium">Time</div>
                <div className="text-gray-300 text-sm sm:text-base mt-1">
                  {displayTime}
                </div>
                
                {(event.endDate || event.duration) && (
                  <div className="flex items-center gap-2 text-gray-400 text-xs sm:text-sm mt-1 break-words">
                    <span>Duration: {getDurationText()}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-gray-400 text-sm sm:text-base">Date and time information not available</p>
        )}
      </div>
    </motion.div>
  );
} 