"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Loader2, User, Mail, Phone } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface EventRegistrationFormProps {
  eventId: string;
  isVirtual: boolean;
  onClose: () => void;
  onSubmit: (formData: EventRegistrationData) => Promise<void>;
  isSubmitting: boolean;
}

export interface EventRegistrationData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

export default function EventRegistrationForm({
  eventId,
  isVirtual,
  onClose,
  onSubmit,
  isSubmitting
}: EventRegistrationFormProps) {
  const [formData, setFormData] = useState<EventRegistrationData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: ''
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }
    
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/.test(formData.phone)) {
      newErrors.phone = 'Please enter a valid phone number';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }
    
    try {
      // Save email to localStorage for future convenience
      localStorage.setItem('user_email', formData.email);
      localStorage.setItem('user_name', `${formData.firstName} ${formData.lastName}`);
      localStorage.setItem('user_phone', formData.phone);
      
      // Call the parent component's onSubmit function
      await onSubmit(formData);
    } catch (error) {
      console.error('Form submission error:', error);
      toast.error('Something went wrong. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-[#1A0D25] border border-[#b967ff]/30 rounded-xl shadow-2xl w-full max-w-md"
      >
        <div className="flex items-center justify-between p-4 border-b border-[#b967ff]/20">
          <h2 className="text-xl font-semibold text-white">Registration Details</h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white rounded-full hover:bg-[#b967ff]/20 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-300 text-sm mb-1">First Name</label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  className={`w-full bg-[#120a19] border ${errors.firstName ? 'border-red-500' : 'border-[#b967ff]/30'} rounded-lg py-2 pl-9 pr-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#b967ff]/50`}
                  placeholder="John"
                />
              </div>
              {errors.firstName && <p className="mt-1 text-red-400 text-xs">{errors.firstName}</p>}
            </div>
            
            <div>
              <label className="block text-gray-300 text-sm mb-1">Last Name</label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  className={`w-full bg-[#120a19] border ${errors.lastName ? 'border-red-500' : 'border-[#b967ff]/30'} rounded-lg py-2 pl-9 pr-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#b967ff]/50`}
                  placeholder="Doe"
                />
              </div>
              {errors.lastName && <p className="mt-1 text-red-400 text-xs">{errors.lastName}</p>}
            </div>
          </div>

          <div>
            <label className="block text-gray-300 text-sm mb-1">Email Address</label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={`w-full bg-[#120a19] border ${errors.email ? 'border-red-500' : 'border-[#b967ff]/30'} rounded-lg py-2 pl-9 pr-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#b967ff]/50`}
                placeholder="johndoe@example.com"
              />
            </div>
            {errors.email && <p className="mt-1 text-red-400 text-xs">{errors.email}</p>}
          </div>

          <div>
            <label className="block text-gray-300 text-sm mb-1">Phone Number</label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <Phone className="w-4 h-4" />
              </div>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className={`w-full bg-[#120a19] border ${errors.phone ? 'border-red-500' : 'border-[#b967ff]/30'} rounded-lg py-2 pl-9 pr-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#b967ff]/50`}
                placeholder="+251912345678"
              />
            </div>
            {errors.phone && <p className="mt-1 text-red-400 text-xs">{errors.phone}</p>}
          </div>

          <div className="pt-4 border-t border-[#b967ff]/20">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 bg-[#b967ff] hover:bg-[#a43dff] disabled:bg-[#b967ff]/50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>Continue to Checkout</>
              )}
            </button>
          </div>

          <p className="text-xs text-gray-400 text-center">
            You will be redirected to our secure payment provider after submission.
          </p>
        </form>
      </motion.div>
    </div>
  );
} 