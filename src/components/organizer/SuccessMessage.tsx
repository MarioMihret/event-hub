import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { CheckCircle2, Calendar, Bell, ChevronRight, Stars, Sparkles, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const SuccessMessage: React.FC = () => {
  const [countdown, setCountdown] = useState(3);
  const [showStatusCheck, setShowStatusCheck] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Show the status check button after 1.5 seconds
    const statusTimer = setTimeout(() => {
      setShowStatusCheck(true);
    }, 1500);

    return () => {
      clearInterval(timer);
      clearTimeout(statusTimer);
    };
  }, []);

  const containerVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { 
        duration: 0.5,
        when: "beforeChildren",
        staggerChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.5 }
    }
  };

  const confettiColors = ['#b967ff', '#9747FF', '#5E17EB', '#8A2BE2', '#FFD700', '#FF69B4'];

  // Get stored application ID from localStorage
  const getApplicationId = () => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("applicationId") || "";
    }
    return "";
  };

  const applicationId = getApplicationId();

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-[#120a19] to-black flex flex-col items-center justify-center p-6">
      {/* Background animated elements */}
      <motion.div 
        className="fixed top-1/4 right-1/4 w-96 h-96 rounded-full bg-purple-500/5 blur-3xl z-0"
        animate={{ 
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.6, 0.3],
        }}
        transition={{ 
          duration: 4,
          repeat: Infinity,
          repeatType: "reverse"
        }}
      />
      
      <motion.div 
        className="fixed bottom-1/4 left-1/4 w-96 h-96 rounded-full bg-purple-500/5 blur-3xl z-0"
        animate={{ 
          scale: [1, 1.3, 1],
          opacity: [0.2, 0.5, 0.2],
        }}
        transition={{ 
          duration: 5,
          repeat: Infinity,
          repeatType: "reverse",
          delay: 1
        }}
      />
      
      <motion.div 
        className="max-w-2xl mx-auto p-6 md:p-8 bg-[#0D0118]/70 backdrop-blur-md rounded-2xl shadow-2xl border border-[#b967ff]/20 text-center relative overflow-hidden z-10"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Decorative elements */}
        <motion.div 
          className="absolute top-0 right-0 h-32 w-32 bg-[#b967ff]/10 rounded-full blur-3xl -mr-10 -mt-10"
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{ 
            duration: 4,
            repeat: Infinity,
            repeatType: "reverse"
          }}
        />
        
        <motion.div 
          className="absolute bottom-0 left-0 h-24 w-24 bg-indigo-600/10 rounded-full blur-3xl -ml-10 -mb-10"
          animate={{ 
            scale: [1, 1.3, 1],
            opacity: [0.2, 0.5, 0.2],
          }}
          transition={{ 
            duration: 5,
            repeat: Infinity,
            repeatType: "reverse",
            delay: 1
          }}
        />
        
        {/* Confetti elements */}
        {Array.from({ length: 15 }).map((_, i) => {
          const color = confettiColors[i % confettiColors.length];
          const size = Math.random() * 8 + 4;
          const left = `${Math.random() * 100}%`;
          const delay = Math.random() * 5;
          const duration = Math.random() * 10 + 10;
          const rotationStart = Math.random() * 360;
          const rotationEnd = rotationStart + Math.random() * 360;
          
          return (
            <motion.div
              key={i}
              className="absolute rounded-full z-10"
              style={{ 
                backgroundColor: color,
                width: size,
                height: size,
                left,
                top: "-20px",
              }}
              animate={{
                top: ["0%", "100%"],
                x: [0, Math.random() * 100 - 50],
                rotate: [rotationStart, rotationEnd],
                opacity: [1, 0]
              }}
              transition={{
                duration,
                repeat: Infinity,
                delay,
                ease: "easeInOut"
              }}
            />
          );
        })}
        
        {/* Success icon with pulsing glow effect */}
        <motion.div
          className="relative inline-block mb-6"
          variants={itemVariants}
        >
          <motion.div 
            className="relative z-10 flex items-center justify-center w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-[#b967ff] to-[#8A2BE2] shadow-lg shadow-purple-500/30"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
          >
            <CheckCircle2 className="w-14 h-14 text-white" />
          </motion.div>
          <motion.div 
            className="absolute inset-0 rounded-full bg-[#b967ff]/30 blur-md z-0"
            animate={{ 
              scale: [1, 1.3, 1],
              opacity: [0.5, 0.8, 0.5]
            }}
            transition={{ 
              duration: 2,
              repeat: Infinity,
              repeatType: "reverse"
            }}
          />
        </motion.div>
        
        {/* Heading with animated sparkles */}
        <motion.div
          className="mb-6 relative"
          variants={itemVariants}
        >
          <motion.h2 
            className="text-3xl md:text-4xl font-bold text-white mb-2"
          >
            <span className="bg-gradient-to-r from-white to-purple-300 bg-clip-text text-transparent">
              Application Submitted!
            </span>
          </motion.h2>
          
          <motion.div 
            className="absolute -right-4 -top-8"
            animate={{ rotate: [-10, 10, -10] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Sparkles className="h-7 w-7 text-yellow-400" />
          </motion.div>
          
          <motion.div 
            className="absolute -left-6 top-6"
            animate={{ 
              rotate: [0, 15, 0],
              scale: [0.8, 1, 0.8]
            }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <Stars className="h-6 w-6 text-purple-300" />
          </motion.div>
          
          <motion.p
            className="text-gray-300 text-lg md:text-xl"
          >
            Your application is on its way to our team!
          </motion.p>
        </motion.div>
        
        {/* Status identifier */}
        <motion.div
          className="mb-8 flex justify-center"
          variants={itemVariants}
        >
          <div className="bg-purple-900/30 px-4 py-2 rounded-full flex items-center space-x-2">
            <motion.div 
              className="w-3 h-3 rounded-full bg-green-400"
              animate={{ scale: [0.8, 1, 0.8], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <span className="text-green-300 text-sm font-medium">Application ID: {applicationId}</span>
          </div>
        </motion.div>
        
        {/* Timeline items */}
        <motion.div 
          className="flex items-center mb-4 p-4 rounded-xl bg-[#1A0D25]/80 backdrop-blur-sm border border-[#b967ff]/10 group"
          variants={itemVariants}
          whileHover={{ scale: 1.02, backgroundColor: "rgba(26, 13, 37, 0.9)" }}
        >
          <div className="flex items-center justify-center w-12 h-12 mr-4 rounded-full bg-[#b967ff]/20 group-hover:bg-[#b967ff]/30 transition-colors duration-300">
            <Calendar className="w-6 h-6 text-[#b967ff]" />
          </div>
          <div className="text-left flex-1">
            <h3 className="text-lg font-medium text-white group-hover:text-purple-300 transition-colors duration-300">Application Review</h3>
            <p className="text-gray-400">Our team will review your application within 5-7 business days.</p>
          </div>
        </motion.div>
        
        {/* Email notification */}
        <motion.div 
          className="flex items-center mb-8 p-4 rounded-xl bg-[#1A0D25]/80 backdrop-blur-sm border border-[#b967ff]/10 group"
          variants={itemVariants}
          whileHover={{ scale: 1.02, backgroundColor: "rgba(26, 13, 37, 0.9)" }}
        >
          <div className="flex items-center justify-center w-12 h-12 mr-4 rounded-full bg-[#b967ff]/20 group-hover:bg-[#b967ff]/30 transition-colors duration-300">
            <Bell className="w-6 h-6 text-[#b967ff]" />
          </div>
          <div className="text-left flex-1">
            <h3 className="text-lg font-medium text-white group-hover:text-purple-300 transition-colors duration-300">Email Notification</h3>
            <p className="text-gray-400">You'll receive an email confirmation shortly with more details.</p>
          </div>
        </motion.div>
        
        {/* Action buttons */}
        <motion.div 
          className="flex flex-col md:flex-row gap-3 mt-6"
          variants={itemVariants}
        >
          <Link href="/dashboard">
            <motion.div 
              className="flex-1 inline-flex items-center justify-center px-6 py-3 text-white bg-gradient-to-r from-[#b967ff] to-purple-800 rounded-xl font-medium shadow-lg hover:shadow-purple-500/30 group cursor-pointer"
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              Go to Dashboard
              <ChevronRight className="w-5 h-5 ml-2 transform group-hover:translate-x-1 transition-transform" />
            </motion.div>
          </Link>
          
          <AnimatePresence>
            {showStatusCheck && applicationId && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex-1"
              >
                <Link href={`/organizer/status/${applicationId}`}>
                  <motion.div 
                    className="w-full inline-flex items-center justify-center px-6 py-3 text-purple-300 border border-purple-700/50 bg-purple-900/20 backdrop-blur-sm rounded-xl font-medium hover:bg-purple-900/30 transition-colors group cursor-pointer"
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Check Status
                    <ArrowRight className="w-5 h-5 ml-2 transform group-hover:translate-x-1 transition-transform" />
                  </motion.div>
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
        
        <motion.p 
          className="mt-6 text-sm text-gray-400"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          {countdown > 0 ? `Redirecting to your application status in ${countdown} seconds...` : "Redirecting..."}
        </motion.p>
      </motion.div>
    </div>
  );
};

export default SuccessMessage;
