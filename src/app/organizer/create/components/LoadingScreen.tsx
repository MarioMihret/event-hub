import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface LoadingScreenProps {
  message?: string;
  onBypassLoading?: () => void;
}

/**
 * LoadingScreen component with step indicators and progress bar
 */
export function LoadingScreen({ 
  message = "Setting up your dashboard...",
  onBypassLoading
}: LoadingScreenProps) {
  const [progress, setProgress] = useState(0);
  
  useEffect(() => {
    const activeTimers: NodeJS.Timeout[] = [];
    
    // Auto-exit loading after a duration if bypass function provided
    if (onBypassLoading) {
      const exitTimer = setTimeout(() => {
        onBypassLoading();
      }, 1500); // Total duration for loading display
      activeTimers.push(exitTimer);
    }
    
    // Setup progress animation
    let animationFrameId: number;
    const startTime = Date.now();
    const duration = 1500; // Duration for the progress bar to fill
    
    const updateProgress = () => {
      const elapsed = Date.now() - startTime;
      const newProgress = Math.min(100, Math.floor((elapsed / duration) * 100));
      
      setProgress(newProgress);
      
      if (elapsed < duration) {
        animationFrameId = requestAnimationFrame(updateProgress);
      }
    };
    
    // Start progress animation
    animationFrameId = requestAnimationFrame(updateProgress);
    
    // Cleanup
    return () => {
      activeTimers.forEach(timer => clearTimeout(timer));
      cancelAnimationFrame(animationFrameId);
    };
  }, [onBypassLoading]);
  
  return (
    <div 
      className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-gray-900 to-black"
      role="alert"
      aria-live="assertive"
      aria-busy="true"
    >
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="text-center max-w-md px-6 py-10 bg-gray-900/50 backdrop-blur-sm rounded-2xl border border-gray-800 shadow-2xl"
      >
        {/* Simple animated spinner */}
        <div className="w-16 h-16 mx-auto mb-6 relative">
          <Loader2 className="w-16 h-16 text-teal-500 animate-spin" />
        </div>
        
        <h2 className="text-2xl font-bold text-white mb-6" id="loading-message">{message}</h2>
        
        {/* Progress bar */}
        <div 
          className="w-full bg-gray-800 rounded-full h-1.5 mb-4 overflow-hidden"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-labelledby="loading-message"
        >
          <div 
            className="bg-gradient-to-r from-teal-500 to-teal-600 h-1.5 rounded-full"
            style={{ width: `${progress}%`, transition: 'width 200ms ease-out' }}
          ></div>
        </div>
        
        <p className="text-gray-500 text-sm">This will only take a moment</p>
      </motion.div>
    </div>
  );
} 