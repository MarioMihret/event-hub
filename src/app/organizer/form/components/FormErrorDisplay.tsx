// app/form/components/FormErrorDisplay.tsx
"use client";

import React, { useState } from 'react';
import { AlertTriangle, X } from "lucide-react";
import { motion, AnimatePresence } from 'framer-motion';

interface FormErrorDisplayProps {
  formErrors: string[];
}

export default function FormErrorDisplay({ formErrors }: FormErrorDisplayProps) {
  const [dismissed, setDismissed] = useState(false);
  
  const handleDismiss = () => {
    setDismissed(true);
  };
  
  // Reset dismiss state when errors change
  React.useEffect(() => {
    setDismissed(false);
  }, [formErrors]);
  
  if (formErrors.length === 0 || dismissed) return null;
  
  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20, transition: { duration: 0.2 } }}
        transition={{ duration: 0.3, type: "spring", stiffness: 500, damping: 30 }}
        className="bg-[#b967ff]/10 border border-[#b967ff]/30 p-5 mb-8 rounded-lg shadow-lg relative overflow-hidden"
      >
        {/* Decorative background flash element */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ 
            opacity: [0, 0.1, 0], 
            scale: [1, 1.2, 1],
          }}
          transition={{ 
            duration: 2,
            repeat: Infinity,
            repeatType: "reverse",
          }}
          className="absolute inset-0 bg-[#b967ff]/30 rounded-lg"
        />
        
        <div className="flex relative z-10">
          <div className="flex items-center justify-center h-10 w-10 rounded-full bg-[#b967ff]/20 text-[#b967ff] flex-shrink-0">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="ml-4 flex-grow">
            <div className="flex justify-between items-start">
              <h3 className="text-base font-medium text-white">Please fix the following errors:</h3>
              <button 
                onClick={handleDismiss}
                className="text-gray-400 hover:text-white transition-colors"
                aria-label="Dismiss errors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <ul className="mt-3 space-y-2 text-sm text-gray-300">
              {formErrors.map((error, index) => (
                <motion.li 
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-start gap-2"
                >
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#b967ff] mt-1.5 flex-shrink-0"></span>
                  <span>{error}</span>
                </motion.li>
              ))}
            </ul>
          </div>
        </div>
        
        <motion.div
          initial={{ width: "0%" }}
          animate={{ width: "100%" }}
          transition={{ duration: 10 }}
          className="absolute bottom-0 left-0 h-1 bg-[#b967ff]/30"
        />
      </motion.div>
    </AnimatePresence>
  );
}