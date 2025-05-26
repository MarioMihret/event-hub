"use client";

import React from "react";
import { Loader } from "lucide-react";
import { motion } from "framer-motion";

export default function EventLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-black to-[#120a19] flex flex-col items-center justify-center">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="relative flex flex-col items-center"
      >
        <div className="w-24 h-24 relative mb-8">
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0 rounded-full border-4 border-[#b967ff]/10 animate-pulse"
          />
          <motion.div 
            initial={{ opacity: 0, rotate: -90 }}
            animate={{ opacity: 1, rotate: 0 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#b967ff] border-r-[#b967ff]/40 animate-spin"
          />
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: "spring" }}
          >
            <Loader className="w-12 h-12 text-[#b967ff] absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 animate-pulse" />
          </motion.div>
        </div>
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-3 w-64 text-center"
        >
          <h2 className="text-xl font-semibold text-white mb-2">Loading Event</h2>
          <p className="text-gray-400">Please wait while we load the event details...</p>
          <div className="flex justify-center gap-2 mt-5">
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.5, 1, 0.5]
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: 0
              }}
              className="w-2 h-2 bg-[#b967ff] rounded-full"
            />
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.5, 1, 0.5]
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: 0.2
              }}
              className="w-2 h-2 bg-[#b967ff] rounded-full"
            />
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.5, 1, 0.5]
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: 0.4
              }}
              className="w-2 h-2 bg-[#b967ff] rounded-full"
            />
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
} 