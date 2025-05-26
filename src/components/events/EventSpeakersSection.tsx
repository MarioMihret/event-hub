"use client";

import { User, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';
import Image from "next/image";
import type { Speaker } from '@/types/speaker'; // Assuming Speaker type is defined here

// Updated to a more professional default avatar
const DEFAULT_SPEAKER_AVATAR = 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?auto=format&fit=crop&q=80&w=800&h=1000';

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
  // Add via.placeholder.com here if we still want to use it as a source but not optimize
  return url.includes('api.dicebear.com') || 
         url.includes('i.pravatar.cc') || 
         url.includes('picsum.photos') ||
         url.includes('via.placeholder.com') || // Keep this in case old data uses it
         url.includes('placehold.co'); // Added placehold.co
};

interface EventSpeakersSectionProps {
  speakers: Speaker[];
}

export default function EventSpeakersSection({ speakers }: EventSpeakersSectionProps) {
  if (!speakers || speakers.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6 }} // Adjust delay
      className="mb-12 relative"
    >
      <div className="absolute -left-10 top-1/3 w-32 h-32 bg-[#8a45cf]/10 rounded-full filter blur-3xl -z-10"></div>
      <h3 className="text-white text-xl font-semibold mb-6 flex items-center gap-2">
        <motion.div
          initial={{ rotate: -10, scale: 0.8 }}
          animate={{ rotate: 0, scale: 1 }}
          transition={{ delay: 0.7, type: "spring" }}
        >
          <User className="w-5 h-5 text-[#b967ff]" />
        </motion.div>
        <span className="relative">
          Speakers
          <motion.span
            initial={{ width: 0 }}
            animate={{ width: "30%" }}
            transition={{ delay: 0.8, duration: 0.8 }}
            className="absolute left-0 bottom-0 h-[2px] bg-gradient-to-r from-[#b967ff] to-transparent"
          />
        </span>
      </h3>

      {/* Updated speakers list with circular images */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
        {speakers.map((speaker, index) => {
          const imageUrl = speaker.avatar?.url || DEFAULT_SPEAKER_AVATAR;
          return (
            <motion.div
              key={speaker.id || index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 + (index * 0.1) }}
              whileHover={{ y: -5, scale: 1.03, transition: { duration: 0.3 } }}
              className="bg-gradient-to-b from-[#1A0D25]/80 to-[#1A0D25]/40 backdrop-blur-sm rounded-xl 
                        p-4 border border-[#b967ff]/20 flex flex-col items-center text-center group 
                        shadow-md hover:shadow-[0_8px_20px_rgba(185,103,255,0.25)] transition-all duration-300"
            >
              {/* Circular avatar */}
              <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden mb-3 
                            border-2 border-[#b967ff]/30 shadow-inner shadow-[#b967ff]/10">
                <Image
                  src={imageUrl}
                  alt={speaker.name}
                  fill
                  className="object-cover object-center transition-transform duration-500 group-hover:scale-110"
                  sizes="(max-width: 640px) 5rem, 6rem"
                  unoptimized={shouldSkipOptimization(imageUrl)}
                />
                
                {/* Subtle highlight effect on top */}
                <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent opacity-40 pointer-events-none h-1/3"></div>
              </div>
              
              {/* Speaker details with improved typography */}
              <h4 className="text-white font-semibold text-sm sm:text-base truncate max-w-full">
                {speaker.name}
              </h4>
              
              {speaker.role && (
                <p className="text-[#b967ff] text-xs font-medium mt-0.5 truncate max-w-full">
                  {speaker.role}
                </p>
              )}
              
              {/* Bio in popover */}
              {speaker.bio && (
                <div className="mt-2 relative group/bio">
                  <button 
                    className="text-xs text-gray-400 hover:text-white flex items-center gap-1 opacity-70 hover:opacity-100 transition-opacity"
                    aria-label="View speaker bio"
                  >
                    <span>Bio</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                  
                  {/* Bio popover that appears on hover */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 
                                bg-[#1A0D25]/95 backdrop-blur-md border border-[#b967ff]/30 
                                rounded-lg shadow-xl z-20 opacity-0 invisible group-hover/bio:opacity-100 
                                group-hover/bio:visible transition-all duration-200 pointer-events-none 
                                group-hover/bio:pointer-events-auto">
                    <div className="text-xs text-gray-300 max-h-32 overflow-y-auto scrollbar-thin scrollbar-thumb-[#b967ff]/20 scrollbar-track-transparent">
                      {speaker.bio}
                    </div>
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 bg-[#1A0D25]/95 border-r border-b border-[#b967ff]/30"></div>
                  </div>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
} 