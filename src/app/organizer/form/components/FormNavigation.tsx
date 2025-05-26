// app/form/components/FormNavigation.tsx
"use client";

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, CheckCircle2, Loader, ArrowLeft, ArrowRight } from "lucide-react";
import { motion } from 'framer-motion';

interface FormNavigationProps {
  currentStep: number;
  totalSteps: number;
  isSubmitting: boolean;
  timeLeft: number | null;
  handleSubmit: (e: React.FormEvent) => void;
  handleNext: () => void;
  handlePrevious: () => void;
}

export default function FormNavigation({ 
  currentStep, 
  totalSteps, 
  isSubmitting, 
  timeLeft,
  handleSubmit,
  handleNext,
  handlePrevious
}: FormNavigationProps) {
  const [tooltip, setTooltip] = useState('');
  
  const showTooltip = (text: string) => {
    setTooltip(text);
  };
  
  const hideTooltip = () => {
    setTooltip('');
  };

  return (
    <div className="relative mt-8 pt-6 border-t border-[#b967ff]/20">
      {/* Step counter */}
      <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-[#1A0D25] px-4 py-1 rounded-full border border-[#b967ff]/20">
        <span className="text-sm text-gray-300">
          Step <span className="text-[#b967ff] font-medium">{currentStep}</span> of <span className="text-white">{totalSteps}</span>
        </span>
      </div>
      
      <div className="flex justify-between items-center relative">
        {/* Tooltip */}
        {tooltip && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-[#2D1B3D] text-white text-xs py-1 px-3 rounded-lg"
          >
            {tooltip}
            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-[#2D1B3D]"></div>
          </motion.div>
        )}
        
        <motion.button
          whileHover={{ scale: 1.05, x: -3 }}
          whileTap={{ scale: 0.95 }}
          type="button"
          onClick={handlePrevious}
          onMouseEnter={() => showTooltip(currentStep === 1 ? 'This is the first step' : 'Go back to previous step')}
          onMouseLeave={hideTooltip}
          disabled={currentStep === 1 || isSubmitting}
          className={`px-5 py-3 rounded-lg flex items-center gap-2 transition-all ${
            currentStep === 1 || isSubmitting 
              ? 'bg-[#2D1B3D]/50 text-gray-500 cursor-not-allowed' 
              : 'bg-[#2D1B3D] text-white border border-[#b967ff]/30 hover:bg-[#2D1B3D]/80 hover:shadow-lg hover:shadow-[#b967ff]/5'
          }`}
        >
          <ArrowLeft className="h-4 w-4" />
          Previous
        </motion.button>
        
        {currentStep < totalSteps ? (
          <motion.button 
            whileHover={{ scale: 1.05, x: 3 }}
            whileTap={{ scale: 0.95 }}
            type="button"
            onClick={handleNext} 
            onMouseEnter={() => showTooltip('Continue to next step')}
            onMouseLeave={hideTooltip}
            disabled={isSubmitting}
            className={`px-6 py-3 bg-[#b967ff] text-white rounded-lg flex items-center gap-2 transition-all shadow-lg ${
              isSubmitting ? 'opacity-70 cursor-not-allowed' : 'hover:bg-[#b967ff]/90 hover:shadow-xl shadow-[#b967ff]/20'
            }`}
          >
            <span>Next Step</span>
            <ArrowRight className="h-4 w-4" />
          </motion.button>
        ) : (
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="button"
            onClick={handleSubmit}
            onMouseEnter={() => showTooltip(isSubmitting ? 'Processing your application...' : 'Submit your organizer application')}
            onMouseLeave={hideTooltip} 
            disabled={isSubmitting}
            className={`px-6 py-3 bg-[#b967ff] text-white rounded-lg flex items-center gap-2 transition-all shadow-lg ${
              isSubmitting ? 'opacity-70 cursor-not-allowed' : 'hover:bg-[#b967ff]/90 hover:shadow-xl shadow-[#b967ff]/20'
            }`}
          >
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                <span className="animate-pulse">Submitting{timeLeft ? ` (${timeLeft}s)` : '...'}</span>
                <Loader className="h-4 w-4 animate-spin" />
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span>Submit Application</span>
                <CheckCircle2 className="h-4 w-4" />
              </div>
            )}
          </motion.button>
        )}
      </div>
      
      {/* Progress text */}
      <div className="text-center mt-6 text-xs text-gray-400">
        {currentStep === totalSteps ? (
          <span>Final step - review your information before submitting</span>
        ) : (
          <span>Complete all steps to submit your application</span>
        )}
      </div>
    </div>
  );
}