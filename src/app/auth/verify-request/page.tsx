"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Mail, Home, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

// Background component
const AnimatedBackground = () => {
  const [backgroundElements, setBackgroundElements] = useState<React.ReactNode>(null);
  
  useEffect(() => {
    // Only generate the random elements on the client side
    const elements = [...Array(6)].map((_, i) => (
      <div 
        key={i}
        className="absolute rounded-full"
        style={{
          top: `${Math.random() * 100}%`,
          left: `${Math.random() * 100}%`,
          width: `${Math.random() * 300 + 50}px`,
          height: `${Math.random() * 300 + 50}px`,
          background: 'radial-gradient(circle, rgba(185, 103, 255, 0.15) 0%, rgba(185, 103, 255, 0) 70%)',
          transform: 'translate(-50%, -50%)',
          animation: `pulse-${i} ${Math.random() * 10 + 15}s infinite alternate`,
        }}
      />
    ));
    
    setBackgroundElements(elements);
  }, []);
  
  return (
    <div className="fixed inset-0 -z-10">
      <div className="absolute inset-0 bg-gradient-to-br from-black via-[#1A0D25] to-black" />
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-0 left-0 w-full h-full">
          {backgroundElements}
        </div>
      </div>
    </div>
  );
};

export default function VerifyRequest() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-2 sm:p-4 py-4 sm:py-6 overflow-auto">
      <AnimatedBackground />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md space-y-6 sm:space-y-8 p-4 sm:p-8 bg-[#120a19] border border-[#b967ff]/20 rounded-xl shadow-lg backdrop-blur-sm my-2"
      >
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 300, damping: 20 }}
          className="flex justify-center"
        >
          <div className="rounded-full bg-[#b967ff]/10 p-3 sm:p-4">
            <Mail className="h-8 w-8 sm:h-12 sm:w-12 text-[#b967ff]" />
          </div>
        </motion.div>
        
        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="text-xl sm:text-2xl font-bold text-center text-white"
        >
          Check your email
        </motion.h1>
        
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.4 }}
          className="text-gray-300 space-y-3 sm:space-y-4 text-center"
        >
          <p className="text-sm sm:text-base">
            A sign in link has been sent to your email address.
          </p>
          <p className="text-sm sm:text-base">
            Please check your inbox and click the link to complete the sign in process.
          </p>
          <p className="text-xs sm:text-sm text-gray-400 italic">
            If you don't see the email, check your spam folder.
          </p>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.4 }}
          className="pt-2 sm:pt-4"
        >
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <Link 
              href="/"
              className="flex items-center justify-center gap-2 rounded-lg bg-[#b967ff] px-4 sm:px-6 py-2 sm:py-3 font-medium text-white hover:bg-[#a34de7] transition-colors shadow-lg shadow-[#b967ff]/20 w-full text-sm sm:text-base"
            >
              <Home className="h-3 w-3 sm:h-4 sm:w-4" />
              Return to Homepage
              <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 ml-1" />
            </Link>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
} 