"use client";

import { useEffect } from "react";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";

// Background component
const AnimatedBackground = () => {
  return (
    <div className="fixed inset-0 -z-10">
      <div className="absolute inset-0 bg-gradient-to-br from-black via-[#1A0D25] to-black" />
      <div className="absolute inset-0 opacity-20">
        {/* Fixed gradient circles for a simpler version */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-[#b967ff]/10"></div>
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 rounded-full bg-[#b967ff]/5"></div>
        <div className="absolute bottom-1/4 right-1/3 w-40 h-40 rounded-full bg-[#b967ff]/10"></div>
      </div>
    </div>
  );
};

export default function SignOut() {
  const router = useRouter();

  useEffect(() => {
    // Sign out and redirect to home page
    const performSignOut = async () => {
      await signOut({ callbackUrl: "/" });
    };
    
    performSignOut();
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-2 sm:p-4 overflow-auto">
      <AnimatedBackground />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="text-center p-4 sm:p-8 rounded-xl bg-[#120a19] border border-[#b967ff]/20 shadow-lg backdrop-blur-sm max-w-md w-full my-2"
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="flex justify-center"
        >
          <div className="w-10 h-10 sm:w-12 sm:h-12 border-4 border-[#b967ff] border-t-transparent rounded-full animate-spin"></div>
        </motion.div>
        <h1 className="text-xl sm:text-2xl font-bold text-white mt-4 mb-2">Signing out</h1>
        <p className="mt-2 text-gray-300 text-sm sm:text-base">Redirecting you to the home page...</p>
      </motion.div>
    </div>
  );
} 