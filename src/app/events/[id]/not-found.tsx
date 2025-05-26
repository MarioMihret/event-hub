"use client";

import React from 'react';
import Link from 'next/link';
import { Calendar, ArrowLeft, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import NoiseBackground from '@/components/ui/NoiseBackground';

// Define a NoiseBackground component for consistency
// const NoiseBackground = () => { ... };

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-black to-[#120a19] flex flex-col items-center justify-center px-4">
      <NoiseBackground />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md bg-[#1A0D25]/40 backdrop-blur-sm border border-[#b967ff]/20 rounded-xl p-8 shadow-[0_8px_30px_rgba(185,103,255,0.1)] text-center"
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, type: "spring" }}
          className="w-20 h-20 bg-[#2a1a38]/70 rounded-full flex items-center justify-center mx-auto mb-6"
        >
          <Calendar className="w-10 h-10 text-[#b967ff]" />
        </motion.div>
        
        <motion.h2 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-3xl font-bold text-white mb-4"
        >
          Event Not Found
        </motion.h2>
        
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-gray-300 mb-8"
        >
          The event you're looking for doesn't exist or has been removed.
        </motion.p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Link 
              href="/events" 
              className="px-6 py-3 bg-[#2e1841] hover:bg-[#3e2254] border border-[#b967ff]/30 rounded-lg transition-all flex items-center gap-2 hover:gap-3"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Return to Events</span>
            </Link>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Link 
              href="/events?search=true" 
              className="px-6 py-3 bg-[#1A0D25] hover:bg-[#2a1a38] border border-[#b967ff]/20 rounded-lg transition-all flex items-center gap-2 hover:gap-3"
            >
              <Search className="w-5 h-5" />
              <span>Search Events</span>
            </Link>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
} 