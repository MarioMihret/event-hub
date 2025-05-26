"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { PlusCircle, Calendar, BarChart2, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Session } from 'next-auth'; // Assuming Session type is available

interface OrganizerWelcomeProps {
  session: Session | null; // Accept session data
}

const OrganizerWelcome: React.FC<OrganizerWelcomeProps> = ({ session }) => {
  const organizerName = session?.user?.name || 'Organizer'; // Get name or use default

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  const buttonHover = { scale: 1.03 };
  const buttonTap = { scale: 0.97 };

  return (
    <motion.div 
      className="relative z-10 flex flex-col items-center justify-start min-h-[calc(80vh)] text-center px-4 sm:px-6 pt-40 md:pt-24"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Personalized Welcome */}
      <motion.h1 
        className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4"
        variants={itemVariants}
      >
        Welcome back, <span className="text-purple-400">{organizerName}</span>!
      </motion.h1>
      
      <motion.p 
        className="text-lg sm:text-xl text-gray-300 mb-8 sm:mb-12 max-w-2xl"
        variants={itemVariants}
      >
        Ready to manage your events? Here are some quick actions to get you started.
      </motion.p>

      {/* Action Buttons */}
      <motion.div 
        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 w-full max-w-4xl"
        // variants={itemVariants} // Apply variants to individual buttons below instead
      >
        {/* Create Event Button */}
        <motion.div variants={itemVariants}>
          <Link href="/organizer/create" passHref legacyBehavior>
            <motion.a
              whileHover={buttonHover}
              whileTap={buttonTap}
              className="flex flex-col items-center justify-center p-6 bg-gradient-to-br from-purple-600 to-purple-800 border border-purple-500/60 rounded-lg shadow-lg text-white hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 focus:ring-offset-black transition-all duration-200 cursor-pointer h-full"
            >
              <PlusCircle className="w-8 h-8 sm:w-10 sm:h-10 mb-3 text-purple-200" />
              <span className="text-base sm:text-lg font-semibold mb-1">Create New Event</span>
              <p className="text-xs sm:text-sm text-purple-200/80">Start planning your next experience.</p>
              <ArrowRight className="w-4 h-4 mt-2 opacity-70" />
            </motion.a>
          </Link>
        </motion.div>

        {/* View Events Button */}
        <motion.div variants={itemVariants}>
          <Link href="/organizer/events" passHref legacyBehavior> 
            <motion.a
              whileHover={buttonHover}
              whileTap={buttonTap}
              className="flex flex-col items-center justify-center p-6 bg-gray-800/70 border border-gray-600/50 rounded-lg shadow-md text-white hover:bg-gray-700/80 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:ring-offset-2 focus:ring-offset-black transition-all duration-200 cursor-pointer h-full"
            >
              <Calendar className="w-8 h-8 sm:w-10 sm:h-10 mb-3 text-teal-300" />
              <span className="text-base sm:text-lg font-semibold mb-1">View My Events</span>
              <p className="text-xs sm:text-sm text-gray-400">See all your upcoming and past events.</p>
              <ArrowRight className="w-4 h-4 mt-2 opacity-70" />
            </motion.a>
          </Link>
        </motion.div>

        {/* View Dashboard/Stats Button (Example - adjust link if needed) */}
         <motion.div variants={itemVariants}>
           <Link href="/organizer/dashboard" passHref legacyBehavior> 
            <motion.a
              whileHover={buttonHover}
              whileTap={buttonTap}
              className="flex flex-col items-center justify-center p-6 bg-gray-800/70 border border-gray-600/50 rounded-lg shadow-md text-white hover:bg-gray-700/80 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:ring-offset-2 focus:ring-offset-black transition-all duration-200 cursor-pointer h-full"
            >
              <BarChart2 className="w-8 h-8 sm:w-10 sm:h-10 mb-3 text-teal-300" />
              <span className="text-base sm:text-lg font-semibold mb-1">View Dashboard</span>
              <p className="text-xs sm:text-sm text-gray-400">Check your event performance and stats.</p>
              <ArrowRight className="w-4 h-4 mt-2 opacity-70" />
            </motion.a>
           </Link>
         </motion.div>
      </motion.div>
    </motion.div>
  );
};

export default OrganizerWelcome; 