"use client";

import { List, Target } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Event } from '@/types/event';

interface EventAudienceReqsSectionProps {
  event: Pick<Event, 'requirements' | 'targetAudience'>;
}

export default function EventAudienceReqsSection({ event }: EventAudienceReqsSectionProps) {
  const hasRequirements = event.requirements && event.requirements.length > 0;
  const hasAudience = event.targetAudience && event.targetAudience.length > 0;

  if (!hasRequirements && !hasAudience) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 mb-12 relative">
      <div className="absolute inset-0 bg-[#b967ff]/5 filter blur-[100px] opacity-20 rounded-full -z-10"></div>

      {/* Requirements */}
      {hasRequirements && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }} // Adjust delay
          className="relative"
        >
          <h3 className="text-white text-lg font-semibold mb-4 flex items-center gap-2">
            <motion.div
              initial={{ rotate: -5, scale: 0.8 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ delay: 0.7, type: "spring" }}
            >
              <List className="w-5 h-5 text-[#b967ff]" />
            </motion.div>
            <span className="relative">
              Requirements
              <motion.span
                initial={{ width: 0 }}
                animate={{ width: "30%" }}
                transition={{ delay: 0.8, duration: 0.8 }}
                className="absolute left-0 bottom-0 h-[2px] bg-gradient-to-r from-[#b967ff] to-transparent"
              />
            </span>
          </h3>
          <div className="bg-[#1A0D25]/40 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-[#b967ff]/20 shadow-[0_4px_30px_rgba(185,103,255,0.07)] hover:shadow-[0_4px_30px_rgba(185,103,255,0.12)] transition-all duration-500">
            <ul className="space-y-3">
              {event.requirements?.map((requirement, index) => (
                <motion.li
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * index + 0.6 }}
                  whileHover={{ x: 3 }}
                  className="flex items-start gap-3 group"
                >
                  <motion.div
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.1 * index + 0.7 }}
                    className="w-2 h-2 rounded-full bg-[#b967ff] mt-2 shrink-0 group-hover:bg-[#d292ff] transition-colors duration-300"
                  />
                  <span className="text-gray-300 group-hover:text-white transition-colors duration-300 break-words">{requirement}</span>
                </motion.li>
              ))}
            </ul>
          </div>
        </motion.div>
      )}

      {/* Target Audience */}
      {hasAudience && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: hasRequirements ? 0.7 : 0.6 }} // Adjust delay based on requirements presence
          className="relative"
        >
          <h3 className="text-white text-lg font-semibold mb-4 flex items-center gap-2">
            <motion.div
              initial={{ rotate: 5, scale: 0.8 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ delay: hasRequirements ? 0.8 : 0.7, type: "spring" }}
            >
              <Target className="w-5 h-5 text-[#b967ff]" />
            </motion.div>
            <span className="relative">
              Target Audience
              <motion.span
                initial={{ width: 0 }}
                animate={{ width: "30%" }}
                transition={{ delay: hasRequirements ? 0.9 : 0.8, duration: 0.8 }}
                className="absolute left-0 bottom-0 h-[2px] bg-gradient-to-r from-[#b967ff] to-transparent"
              />
            </span>
          </h3>
          <div className="bg-[#1A0D25]/40 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-[#b967ff]/20 shadow-[0_4px_30px_rgba(185,103,255,0.07)] hover:shadow-[0_4px_30px_rgba(185,103,255,0.12)] transition-all duration-500">
            <ul className="space-y-3">
              {event.targetAudience?.map((audience, index) => (
                <motion.li
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * index + (hasRequirements ? 0.7 : 0.6) }}
                  whileHover={{ x: 3 }}
                  className="flex items-start gap-3 group"
                >
                  <motion.div
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.1 * index + (hasRequirements ? 0.8 : 0.7) }}
                    className="w-2 h-2 rounded-full bg-[#b967ff] mt-2 shrink-0 group-hover:bg-[#d292ff] transition-colors duration-300"
                  />
                  <span className="text-gray-300 group-hover:text-white transition-colors duration-300 break-words">{audience}</span>
                </motion.li>
              ))}
            </ul>
          </div>
        </motion.div>
      )}
    </div>
  );
} 