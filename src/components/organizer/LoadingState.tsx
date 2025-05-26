// app/components/organizer/LoadingState.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface LoadingStateProps {
  message?: string;
}

const LoadingState: React.FC<LoadingStateProps> = ({ message = "Loading..." }) => {
  const [progressStage, setProgressStage] = useState(0);
  const [animationComplete, setAnimationComplete] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  
  // POTENTIAL UX REVIEW: The `message` prop (e.g., from `useApplicationCheck.status` in `page.tsx`)
  // provides a dynamic status. The `checkingStages` array below also provides dynamic text.
  // Ensure these two sources of status text are complementary and not confusingly redundant.
  // Consider if `checkingStages` should be more generic or if the main `message` prop is sufficient.
  const checkingStages = [
    "Connecting to server",
    "Searching records",
    "Verifying credentials",
    "Checking application status"
  ];
  
  // Update the progress stage every 1.5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setProgressStage(prev => {
        if (prev < checkingStages.length - 1) {
          return prev + 1;
        } else if (!animationComplete) {
          setAnimationComplete(true);
          return prev;
        }
        return prev;
      });
      
      setElapsedTime(prev => prev + 1);
    }, 1500);
    
    return () => clearInterval(timer);
  }, [animationComplete, checkingStages.length]);

  // Animation variants
  const containerVariants = {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { duration: 0.5 } }
  };

  const spinnerVariants = {
    animate: {
      rotate: 360,
      transition: {
        repeat: Infinity,
        duration: 1.5,
        ease: "linear"
      }
    }
  };

  const pulseVariants = {
    animate: {
      scale: [1, 1.05, 1],
      opacity: [0.7, 1, 0.7],
      transition: {
        repeat: Infinity,
        duration: 2.5,
        ease: "easeInOut"
      }
    }
  };

  const progressVariants = {
    initial: { width: "0%" },
    animate: { 
      width: animationComplete ? "100%" : `${(progressStage + 1) * 25}%`,
      transition: { 
        duration: 0.8,
        ease: "easeOut"
      }
    }
  };

  const dotVariants = {
    initial: { opacity: 0.2 },
    animate: {
      opacity: [0.2, 1, 0.2],
      transition: {
        repeat: Infinity,
        duration: 1.5,
        times: [0, 0.5, 1]
      }
    }
  };

  // Circle background animation
  const circleVariants = {
    initial: { scale: 0, opacity: 0 },
    animate: { 
      scale: 1, 
      opacity: 0.05,
      transition: { 
        duration: 1.8,
        ease: "easeOut"
      } 
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-[#120a19] to-black flex flex-col items-center justify-center p-6">
      {/* Decorative elements */}
      <motion.div 
        className="fixed top-1/4 right-1/4 w-96 h-96 rounded-full bg-purple-500/5 blur-3xl z-0"
        variants={pulseVariants}
        animate="animate"
      />
      <motion.div 
        className="fixed bottom-1/4 left-1/4 w-96 h-96 rounded-full bg-purple-500/5 blur-3xl z-0"
        variants={pulseVariants}
        animate="animate"
        style={{ animationDelay: "0.5s" }}
      />
      
      <motion.div
        variants={containerVariants}
        initial="initial"
        animate="animate"
        className="bg-[#0D0118]/70 backdrop-blur-md rounded-xl border border-purple-500/20 shadow-lg p-8 w-full max-w-md relative z-10 overflow-hidden"
      >
        {/* Animated background circle */}
        <motion.div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] h-[200%] rounded-full bg-purple-600/5"
          variants={circleVariants}
          initial="initial" 
          animate="animate"
        />
        
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-white mb-2">Organizer System</h2>
          <p className="text-purple-300 text-lg">{message}</p>
        </div>
        
        <motion.div 
          variants={spinnerVariants}
          animate="animate"
          className="h-20 w-20 mx-auto mb-8 relative"
        >
          <div className="absolute inset-0 rounded-full border-4 border-[#b967ff]/10"></div>
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#b967ff] border-r-[#b967ff]"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div 
              className="h-10 w-10 rounded-full bg-purple-600/20"
              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
              transition={{ repeat: Infinity, duration: 2 }}
            />
          </div>
        </motion.div>
        
        {/* Progress bar */}
        <div className="w-full h-2 bg-purple-900/30 rounded-full mb-6 overflow-hidden">
          <motion.div 
            className="h-full bg-gradient-to-r from-purple-600 to-purple-400 rounded-full"
            variants={progressVariants}
            initial="initial"
            animate="animate"
          />
        </div>
        
        {/* Status stages */}
        <div className="mb-6 min-h-[6rem]">
          <AnimatePresence mode="wait">
            <motion.div
              key={progressStage}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="text-center"
            >
              <div className="text-purple-400 font-medium mb-2">
                {progressStage < checkingStages.length 
                  ? checkingStages[progressStage] 
                  : checkingStages[checkingStages.length - 1]}
                <motion.span variants={dotVariants} animate="animate" className="ml-1">.</motion.span>
                <motion.span variants={dotVariants} animate="animate" className="ml-1" style={{ animationDelay: "0.2s" }}>.</motion.span>
                <motion.span variants={dotVariants} animate="animate" className="ml-1" style={{ animationDelay: "0.4s" }}>.</motion.span>
              </div>
              <p className="text-gray-400 text-sm">
                {animationComplete 
                  ? "This may take a few moments. Please be patient." 
                  : `Stage ${progressStage + 1} of ${checkingStages.length}`}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>
        
        {/* Elapsed time */}
        <motion.div 
          className="text-gray-500 text-xs text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2 }}
        >
          Time elapsed: {Math.floor(elapsedTime / 60) > 0 ? `${Math.floor(elapsedTime / 60)}m ` : ''}{elapsedTime % 60}s
        </motion.div>
      </motion.div>
    </div>
  );
};

export default LoadingState;