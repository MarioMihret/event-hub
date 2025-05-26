"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AlertCircle, ArrowLeft, ShieldAlert } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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

// Component that uses useSearchParams inside Suspense boundary
function AuthErrorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<string>("Default");

  useEffect(() => {
    const errorParam = searchParams.get("error");
    setErrorType(errorParam || "Default");
    
    // Map error codes to user-friendly messages
    const errorMessages: Record<string, string> = {
      Configuration: "There is a problem with the server configuration. Please try again later.",
      AccessDenied: "Access denied. You do not have permission to sign in.",
      Verification: "The verification link is invalid or has expired.",
      Default: "An unexpected error occurred during authentication.",
    };

    // Set error message based on error code
    setError(errorMessages[errorParam || ""] || errorMessages.Default);
    
    // Log the error for debugging
    console.error("Auth error:", errorParam);
  }, [searchParams]);

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
          transition={{ type: "spring", stiffness: 300, damping: 15 }}
          className="flex flex-col items-center text-center"
        >
          <div className="flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-full bg-red-500/10 mb-4 sm:mb-6">
            {errorType === "AccessDenied" ? (
              <ShieldAlert className="h-8 w-8 sm:h-10 sm:w-10 text-red-500" />
            ) : (
              <AlertCircle className="h-8 w-8 sm:h-10 sm:w-10 text-red-500" />
            )}
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white mb-3 sm:mb-4">Authentication Error</h1>
          <AnimatePresence mode="wait">
            <motion.p 
              key={errorType}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="text-gray-300 text-sm sm:text-base"
            >
              {error}
            </motion.p>
          </AnimatePresence>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-6 sm:mt-8 flex flex-col gap-3 sm:gap-4"
        >
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <Link 
              href="/auth/signin"
              className="block w-full rounded-lg bg-[#b967ff] py-2 sm:py-3 font-medium text-white hover:bg-[#a34de7] transition-colors shadow-lg shadow-[#b967ff]/20 text-center text-sm sm:text-base"
            >
              Return to Sign In
            </Link>
          </motion.div>
          
          <motion.button 
            whileHover={{ scale: 1.03 }} 
            whileTap={{ scale: 0.97 }}
            onClick={() => router.back()}
            className="flex items-center justify-center gap-2 w-full rounded-lg border border-[#b967ff]/30 bg-[#2D1D3A]/60 py-2 sm:py-3 font-medium text-gray-300 hover:bg-[#2D1D3A] transition-colors text-sm sm:text-base"
          >
            <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4" />
            Go Back
          </motion.button>
        </motion.div>
      </motion.div>
    </div>
  );
}

// Fallback loading component
function AuthErrorFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-[#1A0D25] to-black">
      <div className="w-8 h-8 sm:w-12 sm:h-12 border-4 border-[#b967ff] border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
}

// Main component with Suspense boundary
export default function AuthError() {
  return (
    <Suspense fallback={<AuthErrorFallback />}>
      <AuthErrorContent />
    </Suspense>
  );
} 