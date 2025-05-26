"use client";

import React, { useRef, useEffect } from "react";
import StepIndicator from "@/components/organizer/StepIndicator";
import PersonalInfoStep from "@/components/organizer/PersonalInfoStep";
import AcademicInfoStep from "@/components/organizer/AcademicInfoStep";
import ExperienceStep from "@/components/organizer/ExperienceStep";
import VerificationStep from "@/components/organizer/VerificationStep";
import FormErrorDisplay from "./FormErrorDisplay";
import FormNavigation from "./FormNavigation";
import { FormData } from '../hooks/useFormState'; // Import the FormData interface
import { motion, AnimatePresence } from 'framer-motion';

// NoiseBackground component
const NoiseBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    let animationFrameId: number;
    let noise: ImageData;
    
    // Set canvas to full screen
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      // Create initial noise
      createNoise();
    };
    
    // Create static noise
    const createNoise = () => {
      const idata = ctx.createImageData(canvas.width, canvas.height);
      const buffer32 = new Uint32Array(idata.data.buffer);
      const len = buffer32.length;
      
      for (let i = 0; i < len; i++) {
        // Purple-themed noise
        const alpha = Math.random() * 0.05; // Very subtle transparency
        if (Math.random() < 0.03) { // Occasional bright purple sparkles
          // ABGR format for canvas
          buffer32[i] = (alpha * 255 < 0 ? 0 : alpha * 255 > 255 ? 255 : alpha * 255) << 24 | 
                       (Math.random() * 100) << 16 | 
                       (Math.random() * 50) << 8 | 
                       0xB9; // Hint of bright purple
        } else {
          buffer32[i] = (alpha * 255 < 0 ? 0 : alpha * 255 > 255 ? 255 : alpha * 255) << 24 | 
                       (Math.random() * 30) << 16 | 
                       (Math.random() * 15) << 8 | 
                       0x30;
        }
      }
      
      noise = idata;
    };
    
    // Animate noise
    const renderNoise = () => {
      if (!ctx || !noise) return;
      
      // Apply subtle intensity
      const idata = ctx.createImageData(canvas.width, canvas.height);
      const buffer32 = new Uint32Array(idata.data.buffer);
      const noiseBuffer = new Uint32Array(noise.data.buffer);
      const len = buffer32.length;
      
      for (let i = 0; i < len; i++) {
        if (Math.random() < 0.3) {
          buffer32[i] = noiseBuffer[i];
        } else {
          buffer32[i] = 0;
        }
      }
      
      ctx.putImageData(idata, 0, 0);
      animationFrameId = requestAnimationFrame(renderNoise);
    };
    
    // Initialize
    resize();
    renderNoise();
    window.addEventListener('resize', resize);
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);
  
  return (
    <canvas 
      ref={canvasRef}
      className="fixed top-0 left-0 w-full h-full -z-10 pointer-events-none opacity-20"
    />
  );
};

interface FormContainerProps {
  formData: FormData; // Replace 'any' with the actual type
  formErrors: string[];
  apiError?: string | null;
  currentStep: number;
  totalSteps: number;
  progressPercentage: number;
  isSubmitting: boolean;
  timeLeft: number | null;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  handleSelectChange: (name: string, value: string) => void;
  handleSkillsChange: (skill: string) => void;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>, fileType: 'idDocument' | 'profilePhoto') => void;
  handleSubmit: (e: React.FormEvent) => void;
  handleNext: () => void;
  handlePrevious: () => void;
}

export default function FormContainer({
  formData,
  formErrors,
  apiError,
  currentStep,
  totalSteps,
  progressPercentage,
  isSubmitting,
  timeLeft,
  handleChange,
  handleSelectChange,
  handleSkillsChange,
  handleFileChange,
  handleSubmit,
  handleNext,
  handlePrevious,
}: FormContainerProps) {
  // Calculate the transform direction based on step change
  const slideDirection = useRef(0); // 1 = right to left, -1 = left to right
  
  useEffect(() => {
    slideDirection.current = 1;
    return () => {
      slideDirection.current = -1;
    };
  }, [currentStep]);

  const variants = {
    enter: (direction: number) => {
      return {
        x: direction > 0 ? 100 : -100,
        opacity: 0
      };
    },
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => {
      return {
        zIndex: 0,
        x: direction < 0 ? 100 : -100,
        opacity: 0
      };
    }
  };

  // Add the steps array before the return statement
  const steps = [
    { id: "personal", name: "Personal", icon: "user" },
    { id: "academic", name: "Academic", icon: "education" },
    { id: "experience", name: "Experience", icon: "experience" },
    { id: "verification", name: "Verification", icon: "verification" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-black to-[#120a19] text-white">
      <NoiseBackground />
      
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="max-w-3xl mx-auto p-6 relative z-10 pt-24"
      >
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 -mt-16 -mr-16 h-40 w-40 bg-[#b967ff]/10 rounded-full blur-2xl"></div>
        <div className="absolute bottom-0 left-0 -mb-12 -ml-12 h-32 w-32 bg-[#b967ff]/10 rounded-full blur-2xl"></div>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="bg-[#1A0D25]/70 backdrop-blur-sm rounded-xl border border-[#b967ff]/20 shadow-lg p-8 relative overflow-hidden"
        >
          {/* Additional decorative background elements */}
          <div className="absolute top-0 right-0 bg-[#b967ff]/05 w-64 h-64 rounded-full -mt-32 -mr-32 backdrop-blur-3xl"></div>
          <div className="absolute bottom-0 left-0 bg-[#b967ff]/05 w-64 h-64 rounded-full -mb-32 -ml-32 backdrop-blur-3xl"></div>
          
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mb-8 relative"
          >
            <h2 className="text-3xl font-bold text-white flex items-center gap-2">
              Organizer <span className="text-[#b967ff]">Application</span>
            </h2>
            <p className="text-gray-300 mt-2">
              Join our team and help organize impactful events at your university.
            </p>
            
            <StepIndicator 
              currentStep={currentStep} 
              steps={steps}
            />
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mb-8 relative"
          >
            {apiError && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                <p><strong>Submission Error:</strong> {apiError}</p>
              </div>
            )}
            <FormErrorDisplay formErrors={formErrors} />
            
            <form onSubmit={(e) => e.preventDefault()} className="relative overflow-hidden">
              <AnimatePresence initial={false} custom={slideDirection.current} mode="wait">
                <motion.div
                  key={currentStep}
                  custom={slideDirection.current}
                  variants={variants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{
                    x: { type: "spring", stiffness: 300, damping: 30 },
                    opacity: { duration: 0.2 }
                  }}
                >
                  {currentStep === 1 && (
                    <PersonalInfoStep 
                      formData={formData} 
                      handleChange={handleChange} 
                    />
                  )}
                  
                  {currentStep === 2 && (
                    <AcademicInfoStep 
                      formData={formData} 
                      handleChange={handleChange} 
                      handleSelectChange={handleSelectChange} 
                    />
                  )}
                  
                  {currentStep === 3 && (
                    <ExperienceStep 
                      formData={formData} 
                      handleChange={handleChange} 
                      handleSelectChange={handleSelectChange} 
                      handleSkillsChange={handleSkillsChange} 
                    />
                  )}
                  
                  {currentStep === 4 && (
                    <VerificationStep 
                      formData={formData} 
                      handleChange={handleChange} 
                      handleFileChange={handleFileChange} 
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </form>
          </motion.div>
          
          <FormNavigation 
            currentStep={currentStep}
            totalSteps={totalSteps}
            isSubmitting={isSubmitting}
            timeLeft={timeLeft}
            handleSubmit={handleSubmit}
            handleNext={handleNext}
            handlePrevious={handlePrevious}
          />
        </motion.div>
      </motion.div>
    </div>
  );
}