import React from 'react';
import { Upload, CheckCircle2, Shield, Camera, Lock, FileCheck } from 'lucide-react';
import { FormData } from '@/app/organizer/form/hooks/useFormState'; // Import the FormData interface
import { motion } from 'framer-motion';

interface VerificationStepProps {
  formData: FormData; // Use the FormData interface
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>, fileType: 'idDocument' | 'profilePhoto') => void;
}

const VerificationStep: React.FC<VerificationStepProps> = ({ 
  formData, 
  handleChange, 
  handleFileChange 
}) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <h3 className="text-2xl font-semibold text-white mb-6 flex items-center gap-2">
        ID Verification & <span className="text-[#b967ff]">Terms</span>
      </h3>
      
      <div className="space-y-8">
        {/* ID Document Upload */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-3"
        >
          <label htmlFor="idDocument" className="block text-sm font-medium text-gray-300 flex items-center gap-2">
            <Shield className="h-4 w-4 text-[#b967ff]" />
            Upload Identification Document
          </label>
          <motion.div 
            whileHover={{ borderColor: '#b967ff50' }}
            className="border-2 border-dashed border-[#2D1B3D] bg-[#1A0D25]/50 rounded-lg p-6 text-center"
          >
            <input
              type="file"
              id="idDocument"
              onChange={(e) => handleFileChange(e, 'idDocument')}
              className="hidden"
              accept=".jpg,.jpeg,.png,.pdf"
            />
            
            {!formData.idPreview ? (
              <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                <Upload className="mx-auto h-12 w-12 text-[#b967ff]/70" />
                <p className="mt-2 text-sm text-gray-300">
                  Click to upload or drag and drop
                </p>
                <p className="text-xs text-gray-400">
                  JPG, PNG or PDF (max. 5MB)
                </p>
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  className="mt-4 px-4 py-2 bg-[#b967ff]/10 text-[#b967ff] rounded-lg hover:bg-[#b967ff]/20 focus:outline-none focus:ring-2 focus:ring-[#b967ff]/50 transition-all"
                  onClick={() => document.getElementById('idDocument')?.click()}
                >
                  Select ID Document
                </motion.button>
              </motion.div>
            ) : (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-3"
              >
                <motion.div 
                  className="flex items-center justify-center"
                  whileHover={{ scale: 1.05 }}
                  transition={{ duration: 0.2 }}
                >
                  {formData.idPreview.startsWith('data:image') ? (
                    <div className="relative group">
                      <img 
                        src={formData.idPreview} 
                        alt="ID Preview" 
                        className="max-h-44 rounded-lg border-2 border-[#b967ff]/30" 
                      />
                      <div className="absolute inset-0 bg-[#1A0D25]/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                        <p className="text-white text-sm">Document Preview</p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-6 bg-[#b967ff]/10 rounded-lg border border-[#b967ff]/30">
                      <FileCheck className="h-10 w-10 text-[#b967ff] mx-auto" />
                      <p className="mt-2 text-sm text-white">PDF document uploaded</p>
                    </div>
                  )}
                </motion.div>
                {/* <p className="text-sm text-gray-300">
                  {formData.idDocument?.name} // Removed as formData.idDocument is base64 string
                </p> */}
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  className="px-3 py-1.5 text-sm border border-[#b967ff]/30 text-[#b967ff] rounded-lg hover:bg-[#b967ff]/10 focus:outline-none focus:ring-2 focus:ring-[#b967ff]/30 transition-all"
                  onClick={() => document.getElementById('idDocument')?.click()}
                >
                  Change File
                </motion.button>
              </motion.div>
            )}
          </motion.div>
          <p className="text-xs text-gray-400">
            Please upload a valid student ID, national ID, passport, or driver's license
          </p>
        </motion.div>
        
        {/* Profile Photo Upload */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-3"
        >
          <label htmlFor="profilePhoto" className="block text-sm font-medium text-gray-300 flex items-center gap-2">
            <Camera className="h-4 w-4 text-[#b967ff]" />
            Upload Profile Photo
          </label>
          <motion.div 
            whileHover={{ borderColor: '#b967ff50' }}
            className="border-2 border-dashed border-[#2D1B3D] bg-[#1A0D25]/50 rounded-lg p-6 text-center"
          >
            <input
              type="file"
              id="profilePhoto"
              onChange={(e) => handleFileChange(e, 'profilePhoto')}
              className="hidden"
              accept=".jpg,.jpeg,.png"
            />
            
            {!formData.profilePhotoPreview ? (
              <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                <Camera className="mx-auto h-12 w-12 text-[#b967ff]/70" />
                <p className="mt-2 text-sm text-gray-300">
                  Upload a professional photo of yourself
                </p>
                <p className="text-xs text-gray-400">
                  JPG or PNG (max. 5MB)
                </p>
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  className="mt-4 px-4 py-2 bg-[#b967ff]/10 text-[#b967ff] rounded-lg hover:bg-[#b967ff]/20 focus:outline-none focus:ring-2 focus:ring-[#b967ff]/50 transition-all"
                  onClick={() => document.getElementById('profilePhoto')?.click()}
                >
                  Select Photo
                </motion.button>
              </motion.div>
            ) : (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-3"
              >
                <motion.div 
                  className="flex items-center justify-center"
                  whileHover={{ scale: 1.05 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="relative">
                    <img 
                      src={formData.profilePhotoPreview} 
                      alt="Profile Preview" 
                      className="h-44 w-44 rounded-full object-cover border-2 border-[#b967ff]/30" 
                    />
                    <div className="absolute bottom-0 right-0 bg-[#1A0D25] p-1.5 rounded-full border border-[#b967ff]/30">
                      <Camera className="h-4 w-4 text-[#b967ff]" />
                    </div>
                  </div>
                </motion.div>
                {/* <p className="text-sm text-gray-300">
                  {formData.profilePhoto?.name} // Removed as formData.profilePhoto is base64 string
                </p> */}
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  className="px-3 py-1.5 text-sm border border-[#b967ff]/30 text-[#b967ff] rounded-lg hover:bg-[#b967ff]/10 focus:outline-none focus:ring-2 focus:ring-[#b967ff]/30 transition-all"
                  onClick={() => document.getElementById('profilePhoto')?.click()}
                >
                  Change Photo
                </motion.button>
              </motion.div>
            )}
          </motion.div>
        </motion.div>
        
        {/* Terms and Conditions */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-4 pt-2"
        >
          <motion.div 
            whileHover={{ x: 5 }}
            className="flex items-start space-x-3"
          >
            <div className="flex items-center h-5 pt-0.5">
              <motion.input 
                whileTap={{ scale: 0.9 }}
                type="checkbox" 
                id="termsAccepted" 
                name="termsAccepted"
                checked={formData.termsAccepted}
                onChange={(e) => handleChange(e)}
                className="h-4 w-4 bg-[#2D1B3D] text-[#b967ff] focus:ring-[#b967ff]/50 border-[#b967ff]/30 rounded"
              />
            </div>
            <div>
              <label
                htmlFor="termsAccepted"
                className="text-sm font-medium text-white"
              >
                I agree to the terms and conditions
              </label>
              <p className="text-xs text-gray-400">
                By submitting this application, you agree to our privacy policy and code of conduct.
              </p>
            </div>
          </motion.div>
          
          {/* Newsletter Subscription */}
          <motion.div 
            whileHover={{ x: 5 }}
            className="flex items-start space-x-3"
          >
            <div className="flex items-center h-5 pt-0.5">
              <motion.input 
                whileTap={{ scale: 0.9 }}
                type="checkbox" 
                id="newsletterSubscription" 
                name="newsletterSubscription"
                checked={formData.newsletterSubscription}
                onChange={(e) => handleChange(e)}
                className="h-4 w-4 bg-[#2D1B3D] text-[#b967ff] focus:ring-[#b967ff]/50 border-[#b967ff]/30 rounded"
              />
            </div>
            <div>
              <label
                htmlFor="newsletterSubscription"
                className="text-sm font-medium text-white"
              >
                Subscribe to our newsletter
              </label>
              <p className="text-xs text-gray-400">
                Receive updates about upcoming events and opportunities (optional)
              </p>
            </div>
          </motion.div>
        </motion.div>
      </div>
      
      {/* Security Message */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="flex items-start p-4 bg-[#1A0D25]/70 backdrop-blur-sm rounded-xl border border-[#b967ff]/20 shadow-lg"
      >
        <div className="flex items-center justify-center h-12 w-12 rounded-full bg-[#b967ff]/20 text-[#b967ff] flex-shrink-0 mr-4">
          <Lock className="h-6 w-6" />
        </div>
        <div>
          <h4 className="text-sm font-medium text-white mb-1">Your Data is Secure</h4>
          <p className="text-sm text-gray-300">
            Your information is protected and will only be used for verification purposes. We never share your data with third parties.
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default VerificationStep;