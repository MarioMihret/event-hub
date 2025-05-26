import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, Calendar, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

interface PersonalInfoStepProps {
  formData: {
    fullName: string;
    email: string;
    phone: string;
    dateOfBirth: string;
  };
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
}

const PersonalInfoStep: React.FC<PersonalInfoStepProps> = ({ formData, handleChange }) => {
  const [ageError, setAgeError] = useState<string | null>(null);

  // Age validation function
  // POTENTIAL IMPROVEMENT: This age validation logic is also present in `useFormState.ts`.
  // Consider centralizing this logic in the hook or a shared utility function to avoid duplication and ensure consistency.
  const validateAge = (dateString: string): boolean => {
    if (!dateString) return true; // Don't show error for empty field (handled by form validation)
    
    const birthDate = new Date(dateString);
    const today = new Date();
    
    // Calculate age
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    // Adjust age if birthday hasn't occurred yet this year
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age >= 18;
  };

  // Validate age when date of birth changes
  useEffect(() => {
    if (formData.dateOfBirth) {
      const isValidAge = validateAge(formData.dateOfBirth);
      setAgeError(isValidAge ? null : "You must be at least 18 years old to apply");
    } else {
      setAgeError(null);
    }
  }, [formData.dateOfBirth]);

  // Custom change handler for date of birth
  const handleDateOfBirthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleChange(e);
    const isValidAge = validateAge(e.target.value);
    setAgeError(isValidAge ? null : "You must be at least 18 years old to apply");
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <h3 className="text-2xl font-semibold text-white mb-6 flex items-center gap-2">
        Personal <span className="text-[#b967ff]">Information</span>
      </h3>
      
      <div className="space-y-6 bg-[#1A0D25]/70 backdrop-blur-sm rounded-xl p-6 border border-[#b967ff]/20 shadow-lg">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-2"
        >
          <label htmlFor="fullName" className="block text-sm font-medium text-gray-300 flex items-center gap-2">
            <User className="h-4 w-4 text-[#b967ff]" />
            Full Name
          </label>
          <input 
            id="fullName" 
            name="fullName" 
            value={formData.fullName} 
            onChange={handleChange} 
            placeholder="Enter your full name" 
            className="w-full py-3 px-4 bg-[#2D1B3D] border-[#b967ff]/30 focus:border-[#b967ff] focus:ring focus:ring-[#b967ff]/30 rounded-lg shadow-sm text-white transition-all"
          />
          <p className="text-xs text-gray-400">Please enter your name as it appears on your ID documents</p>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-2"
        >
          <label htmlFor="email" className="block text-sm font-medium text-gray-300 flex items-center gap-2">
            <Mail className="h-4 w-4 text-[#b967ff]" />
            Email Address
          </label>
          <input 
            id="email" 
            name="email" 
            type="email" 
            value={formData.email} 
            onChange={handleChange} 
            placeholder="your.email@example.com" 
            className="w-full py-3 px-4 bg-[#2D1B3D] border-[#b967ff]/30 focus:border-[#b967ff] focus:ring focus:ring-[#b967ff]/30 rounded-lg shadow-sm text-white transition-all"
          />
          <p className="text-xs text-gray-400">We'll use this email for all communications</p>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-2"
        >
          <label htmlFor="phone" className="block text-sm font-medium text-gray-300 flex items-center gap-2">
            <Phone className="h-4 w-4 text-[#b967ff]" />
            Phone Number
          </label>
          <input 
            id="phone" 
            name="phone" 
            value={formData.phone} 
            onChange={handleChange} 
            placeholder="+251 91 234 5678" 
            className="w-full py-3 px-4 bg-[#2D1B3D] border-[#b967ff]/30 focus:border-[#b967ff] focus:ring focus:ring-[#b967ff]/30 rounded-lg shadow-sm text-white transition-all"
          />
          <p className="text-xs text-gray-400">For urgent communications and verification</p>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-2"
        >
          <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-300 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-[#b967ff]" />
            Date of Birth
          </label>
          <input 
            id="dateOfBirth" 
            name="dateOfBirth" 
            type="date" 
            value={formData.dateOfBirth} 
            onChange={handleDateOfBirthChange}
            className={`w-full py-3 px-4 bg-[#2D1B3D] border-[#b967ff]/30 focus:border-[#b967ff] focus:ring focus:ring-[#b967ff]/30 rounded-lg shadow-sm text-white transition-all ${ageError ? 'border-red-400 focus:border-red-400 focus:ring-red-400/30' : ''}`}
            max={new Date().toISOString().split('T')[0]} // Prevent future dates
          />
          {ageError ? (
            <p className="text-xs text-red-400 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {ageError}
            </p>
          ) : (
            <p className="text-xs text-gray-400">You must be at least 18 years old to apply</p>
          )}
        </motion.div>
      </div>
      
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="flex items-start p-4 bg-[#1A0D25]/70 backdrop-blur-sm rounded-xl border border-[#b967ff]/20 shadow-lg"
      >
        <div className="flex items-center justify-center h-12 w-12 rounded-full bg-[#b967ff]/20 text-[#b967ff] flex-shrink-0 mr-4">
          <User className="h-6 w-6" />
        </div>
        <p className="text-sm text-gray-300">
          Your personal information is protected and will only be used for verification purposes.
        </p>
      </motion.div>
    </motion.div>
  );
};

export default PersonalInfoStep;