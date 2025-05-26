"use client";

import { MessageCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import DOMPurify from 'isomorphic-dompurify';
import type { Event } from '@/types/event';

interface EventDescriptionSectionProps {
  event: Pick<Event, 'description'>; // Only need description
}

export default function EventDescriptionSection({ event }: EventDescriptionSectionProps) {
  if (!event?.description) {
    return null; // Or render a placeholder
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }} // Adjust delay as needed if it's the only thing
      className="mb-12 relative"
    >
      <h3 className="text-white text-xl font-semibold mb-4 flex items-center gap-2">
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.6, type: "spring" }}
        >
          <MessageCircle className="w-5 h-5 text-[#b967ff]" />
        </motion.div>
        <span className="relative">
          About This Event
          <motion.span
            initial={{ width: 0 }}
            animate={{ width: "30%" }}
            transition={{ delay: 0.8, duration: 0.8 }}
            className="absolute left-0 bottom-0 h-[2px] bg-gradient-to-r from-[#b967ff] to-transparent"
          />
        </span>
      </h3>
      <div className="bg-[#1A0D25]/40 backdrop-blur-sm rounded-xl p-4 sm:p-6 md:p-8 prose prose-invert max-w-none border border-[#b967ff]/20 shadow-[0_4px_30px_rgba(185,103,255,0.07)] hover:shadow-[0_4px_30px_rgba(185,103,255,0.12)] transition-all duration-500">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.8 }}
          className="text-gray-300 leading-relaxed tracking-wide text-base md:text-lg max-w-full overflow-hidden"
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(event.description) }}
        />
      </div>
    </motion.div>
  );
} 