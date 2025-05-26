import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, User, BookOpen, Award, ClipboardCheck } from 'lucide-react';

interface StepIndicatorProps {
  currentStep: number;
  steps: {
    id: string;
    name: string;
    icon: string;
  }[];
}

const StepIndicator: React.FC<StepIndicatorProps> = ({ currentStep, steps }) => {
  // Render the appropriate icon based on the step
  const renderIcon = (icon: string) => {
    switch (icon) {
      case 'user':
        return <User className="h-5 w-5" />;
      case 'education':
        return <BookOpen className="h-5 w-5" />;
      case 'experience':
        return <Award className="h-5 w-5" />;
      case 'verification':
        return <ClipboardCheck className="h-5 w-5" />;
      default:
        return <User className="h-5 w-5" />;
    }
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        staggerChildren: 0.1,
        delayChildren: 0.3
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <motion.div 
      className="w-full mb-8 px-4"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isActive = index + 1 === currentStep;
          const isCompleted = index + 1 < currentStep;
          
          // Define styles based on step state
          const circleBaseClasses = "flex items-center justify-center h-10 w-10 rounded-full border-2 transition-all duration-300 relative";
          const circleClasses = isActive 
            ? `${circleBaseClasses} border-[#b967ff] bg-[#b967ff]/20 text-[#b967ff]` 
            : isCompleted 
              ? `${circleBaseClasses} border-[#b967ff] bg-[#b967ff] text-white` 
              : `${circleBaseClasses} border-gray-300 bg-transparent text-gray-400`;
          
          // Text styling
          const textClasses = isActive 
            ? "mt-2 text-sm font-medium text-[#b967ff]" 
            : isCompleted 
              ? "mt-2 text-sm font-medium text-gray-300" 
              : "mt-2 text-sm font-medium text-gray-400";
          
          return (
            <motion.div 
              key={step.id}
              className="flex flex-col items-center"
              variants={itemVariants}
              whileHover={{ scale: isActive ? 1.05 : 1.02 }}
            >
              {/* Step circle */}
              <motion.div 
                className={circleClasses}
                whileTap={{ scale: 0.95 }}
              >
                {isCompleted ? (
                  <CheckCircle className="h-5 w-5" />
                ) : (
                  renderIcon(step.icon)
                )}
                
                {/* Pulsing effect for active step */}
                {isActive && (
                  <motion.div 
                    className="absolute inset-0 rounded-full border-2 border-[#b967ff]"
                    animate={{ 
                      scale: [1, 1.2, 1],
                      opacity: [1, 0, 1]
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      repeatType: "loop"
                    }}
                  />
                )}
              </motion.div>
              
              <span className={textClasses}>{step.name}</span>
              
              {/* Display progress indicator on hover */}
              {isCompleted && (
                <motion.span 
                  className="mt-1 text-xs text-gray-400"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  Completed
                </motion.span>
              )}
            </motion.div>
          );
        })}
      </div>
      
      {/* Progress bar */}
      <div className="relative mt-4 h-0.5 bg-gray-200 mx-12">
        <motion.div 
          className="absolute top-0 left-0 h-full bg-gradient-to-r from-[#b967ff] to-purple-700"
          initial={{ width: '0%' }}
          animate={{ 
            width: `${steps.length > 1 ? ((currentStep - 1) / (steps.length - 1)) * 100 : (currentStep === 1 && steps.length === 1 ? 100 : 0)}%`,
          }}
          transition={{ 
            duration: 0.5,
            ease: "easeOut"
          }}
        />
        
        {/* Animated progress dot */}
        <motion.div 
          className="absolute top-0 h-3 w-3 rounded-full bg-[#b967ff] -mt-1 shadow-lg shadow-purple-500/20"
          style={{ 
            left: `${steps.length > 1 ? ((currentStep - 1) / (steps.length - 1)) * 100 : (currentStep === 1 && steps.length === 1 ? 100 : 0)}%`,
          }}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ 
            type: "spring",
            stiffness: 300,
            damping: 15
          }}
        />
      </div>
    </motion.div>
  );
};

export default StepIndicator;