"use client";

import { ImageIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import Image from "next/image";
import type { Event } from '@/types/event';

interface EventLogoSectionProps {
  event: Pick<Event, 'title' | 'logo'>;
}

export default function EventLogoSection({ event }: EventLogoSectionProps) {
  if (!event.logo) {
    return null;
  }

  const logoUrl = typeof event.logo === 'string' ? event.logo : (event.logo?.url || 'https://via.placeholder.com/400?text=Event+Logo');
  const attribution = typeof event.logo === 'object' ? event.logo.attribution : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }} // Adjust delay
      className="mb-12 relative"
    >
      <h3 className="text-white text-xl font-semibold mb-4 flex items-center gap-2">
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.6, type: "spring" }}
        >
          <ImageIcon className="w-5 h-5 text-[#b967ff]" />
        </motion.div>
        <span className="relative">
          Event Branding
          <motion.span
            initial={{ width: 0 }}
            animate={{ width: "30%" }}
            transition={{ delay: 0.8, duration: 0.8 }}
            className="absolute left-0 bottom-0 h-[2px] bg-gradient-to-r from-[#b967ff] to-transparent"
          />
        </span>
      </h3>
      <div className="flex justify-center p-4 sm:p-6 md:p-8 bg-[#1A0D25]/40 backdrop-blur-sm rounded-xl border border-[#b967ff]/20 shadow-[0_4px_30px_rgba(185,103,255,0.07)] hover:shadow-[0_4px_30px_rgba(185,103,255,0.12)] transition-all duration-500">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.7, type: "spring" }}
          className="relative w-full max-w-[240px] h-60 sm:w-80 sm:h-80 lg:w-96 lg:h-96 overflow-hidden"
        >
          <Image
            src={logoUrl}
            alt={`${event.title} logo`}
            fill
            className="object-contain p-4"
          />
          {attribution && (
            <div className="absolute bottom-0 right-0 bg-black/70 text-xs text-white px-2 py-1 rounded-tl-md">
              {attribution.photographer && `Photo by ${attribution.photographer}`}
            </div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
} 