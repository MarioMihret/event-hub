"use client";

import React from "react";
import { motion } from "framer-motion";
import { Tag, Award } from "lucide-react";
import type { Event } from "@/types/event";

interface TagsSectionProps {
  event: Event;
}

export default function TagsSection({ event }: TagsSectionProps) {
  // Don't render if no tags or skill level
  if ((!event.tags || event.tags.length === 0) && !event.skillLevel) {
    return null;
  }
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
    >
      <h3 className="text-white text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center gap-2">
        <Tag className="w-4 h-4 sm:w-5 sm:h-5 text-[#b967ff]" />
        Tags & Skills
      </h3>
      
      <div className="bg-[#1A0D25]/70 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-[#b967ff]/10">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-[#b967ff]/10 flex items-center justify-center border border-[#b967ff]/20 shrink-0">
            <Tag className="w-5 h-5 sm:w-6 sm:h-6 text-[#b967ff]" />
          </div>
          
          <div className="w-full min-w-0">
            {event.skillLevel && (
              <motion.div 
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="flex items-center gap-2 mb-3 sm:mb-4"
              >
                <Award className="w-4 h-4 sm:w-5 sm:h-5 text-[#b967ff]" />
                <span className="text-white text-xs sm:text-sm font-medium px-2 sm:px-3 py-1 bg-[#b967ff]/10 rounded-full">
                  {event.skillLevel} level
                </span>
              </motion.div>
            )}

            {event.tags && event.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {event.tags.map((tag, index) => (
                  <motion.span
                    key={index}
                    initial={{ opacity: 0, scale: 0.8, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ 
                      delay: 0.1 * index + 0.7,
                      type: "spring",
                      stiffness: 200
                    }}
                    whileHover={{ 
                      scale: 1.05, 
                      backgroundColor: "rgba(185, 103, 255, 0.2)" 
                    }}
                    className="px-2 sm:px-3 py-1 sm:py-1.5 bg-[#2D1B3D] text-gray-300 rounded-full text-xs font-medium border border-[#b967ff]/10 cursor-default mb-1"
                  >
                    {tag}
                  </motion.span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
} 