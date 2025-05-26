"use client";

import React from "react";
import { motion } from "framer-motion";

// Define color scheme constants
const COLORS = {
  darkPurple: '#120a19',
  brightPurple: '#b967ff',
  black: '#000000',
  white: '#ffffff',
};

const SkeletonLoader: React.FC = () => {
  // Create pulse animation
  const pulseVariants = {
    initial: { opacity: 0.5 },
    animate: {
      opacity: [0.5, 0.8, 0.5],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  };

  // Shimmer effect
  const shimmer = {
    initial: { x: "-100%", opacity: 0.1 },
    animate: {
      x: "100%",
      opacity: [0, 0.3, 0],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut",
        repeatDelay: 0.5
      }
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-[#120a19]/70 backdrop-blur-sm border border-[#b967ff]/10 
                rounded-xl overflow-hidden shadow-lg relative flex flex-col"
    >
      {/* Shimmer overlay */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="w-[50%] h-full bg-gradient-to-r from-transparent via-[#b967ff]/10 to-transparent absolute skew-x-12"
          variants={shimmer}
          initial="initial"
          animate="animate"
        />
      </div>
      
      {/* Image placeholder area - h-64 like EventCard */}
      <div className="h-64 bg-[#1e0f2d]/50 relative">
        {/* Category/tag placeholder - Adjusted for consistency */}
        <motion.div 
          variants={pulseVariants}
          initial="initial"
          animate="animate"
          className="absolute top-4 left-4 h-5 w-24 bg-[#b967ff]/20 rounded-full"
        />
        
        {/* Expired badge placeholder - Adjusted */}
        <motion.div 
          variants={pulseVariants}
          initial="initial"
          animate="animate"
          className="absolute top-4 right-4 h-5 w-20 bg-[#b967ff]/20 rounded-full"
        />
        
        {/* Time indicator placeholder - Adjusted */}
        <motion.div 
          variants={pulseVariants}
          initial="initial"
          animate="animate"
          className="absolute top-12 right-4 h-5 w-28 bg-[#b967ff]/20 rounded-full" // Moved down slightly if category is present
        />
        
        {/* Attendees placeholder - Adjusted */}
        <motion.div 
          variants={pulseVariants}
          initial="initial"
          animate="animate"
          className="absolute bottom-4 right-4 h-5 w-20 bg-[#b967ff]/20 rounded-full"
        />
        {/* Removed title placeholder from image area */}
      </div>
      
      {/* Content placeholder - p-6 like EventCard and flex-grow */}
      <div className="p-6 flex flex-col flex-grow space-y-4">
        {/* Title placeholder - Taller and wider */}
        <motion.div 
          variants={pulseVariants}
          initial="initial"
          animate="animate"
          className="h-6 bg-[#b967ff]/15 rounded-md w-3/4 mb-1" 
        />
        <motion.div 
          variants={pulseVariants}
          initial="initial"
          animate="animate"
          className="h-6 bg-[#b967ff]/15 rounded-md w-1/2 mb-3" 
        />

        {/* Meta Info Section - Mimicking EventCard structure */}
        <div className="flex flex-col gap-2 mb-2">
          {/* Date placeholder */}
          <div className="flex items-center gap-2">
            <motion.div variants={pulseVariants} initial="initial" animate="animate" className="w-4 h-4 rounded-sm bg-[#b967ff]/20" />
            <motion.div variants={pulseVariants} initial="initial" animate="animate" className="h-4 bg-[#b967ff]/10 rounded-md w-1/2" />
          </div>
          {/* Time placeholder */}
          <div className="flex items-center gap-2">
            <motion.div variants={pulseVariants} initial="initial" animate="animate" className="w-4 h-4 rounded-sm bg-[#b967ff]/20" />
            <motion.div variants={pulseVariants} initial="initial" animate="animate" className="h-4 bg-[#b967ff]/10 rounded-md w-1/3" />
          </div>
          {/* Location placeholder */}
          <div className="flex items-center gap-2">
            <motion.div variants={pulseVariants} initial="initial" animate="animate" className="w-4 h-4 rounded-sm bg-[#b967ff]/20" />
            <motion.div variants={pulseVariants} initial="initial" animate="animate" className="h-4 bg-[#b967ff]/10 rounded-md w-3/5" />
          </div>
          {/* Price placeholder */}
          <div className="flex items-center gap-2">
            <motion.div variants={pulseVariants} initial="initial" animate="animate" className="w-4 h-4 rounded-sm bg-[#b967ff]/20" />
            <motion.div variants={pulseVariants} initial="initial" animate="animate" className="h-4 bg-[#b967ff]/10 rounded-md w-1/4" />
          </div>
        </div>

        {/* Description Placeholder - Two lines */}
        <motion.div variants={pulseVariants} initial="initial" animate="animate" className="h-4 bg-[#b967ff]/10 rounded-md w-full" />
        <motion.div variants={pulseVariants} initial="initial" animate="animate" className="h-4 bg-[#b967ff]/10 rounded-md w-5/6 mb-3" />

        {/* Action Bar Placeholder - flex-grow to push to bottom, then align items */}
        <div className="mt-auto pt-4 border-t border-[#b967ff]/10 flex justify-between items-center">
            <motion.div 
              variants={pulseVariants}
              initial="initial"
              animate="animate"
              className="h-5 bg-[#b967ff]/15 rounded-md w-1/3" 
            />
            {/* Optional placeholder for edit/delete buttons area */}
            <motion.div 
              variants={pulseVariants}
              initial="initial"
              animate="animate"
              className="h-5 bg-[#b967ff]/15 rounded-md w-1/4" 
            />
        </div>
      </div>
    </motion.div>
  );
};

export default SkeletonLoader; 