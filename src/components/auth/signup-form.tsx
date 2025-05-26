"use client"
import React, { FormEvent, useState, useEffect, Suspense } from 'react';
import { Mail, Lock, User, AlertCircle, Loader2, Eye, EyeOff, CheckCircle, UserPlus, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';

// Animated background component
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

// Main SignUpForm component
function SignUpFormContent() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [emailValid, setEmailValid] = useState(true);
  const [passwordStrength, setPasswordStrength] = useState<'weak' | 'medium' | 'strong' | 'very-strong'>('weak');
  const [fieldTouched, setFieldTouched] = useState({
    name: false,
    email: false,
    password: false,
    confirmPassword: false
  });
  
  const router = useRouter();

  // Email validation function
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Password strength checker
  const checkPasswordStrength = (password: string) => {
    if (password.length < 8) return 'weak';
    
    let score = 0;
    // Check for mixed case
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    // Check for numbers
    if (/\d/.test(password)) score++;
    // Check for special characters
    if (/[^a-zA-Z\d]/.test(password)) score++;
    // Length bonus
    if (password.length > 12) score++;
    
    if (score === 1) return 'medium';
    if (score === 2) return 'strong';
    if (score >= 3) return 'very-strong';
    return 'weak';
  };

  // Update field touched state
  const handleBlur = (field: 'name' | 'email' | 'password' | 'confirmPassword') => {
    setFieldTouched(prev => ({
      ...prev,
      [field]: true
    }));
    
    // Validate email on blur
    if (field === 'email') {
      setEmailValid(validateEmail(email));
    }
    
    // Check password strength on blur
    if (field === 'password') {
      setPasswordStrength(checkPasswordStrength(password));
    }
  };

  // Handle password change
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPassword = e.target.value;
    setPassword(newPassword);
    if (fieldTouched.password) {
      setPasswordStrength(checkPasswordStrength(newPassword));
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Reset states
    setError(null);
    setSuccess(null);
    
    // Mark all fields as touched
    setFieldTouched({
      name: true,
      email: true,
      password: true,
      confirmPassword: true
    });
    
    // Basic validation
    if (!name || !email || !password || !confirmPassword) {
      setError('All fields are required');
      return;
    }
    
    // Email validation
    if (!validateEmail(email)) {
      setEmailValid(false);
      setError('Please enter a valid email address');
      return;
    }
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }
    
    // Check password strength
    const strength = checkPasswordStrength(password);
    if (strength === 'weak') {
      setError('Please use a stronger password with a mix of letters, numbers and symbols');
      return;
    }
    
    try {
      setLoading(true);
      
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create account');
      }
      
      setSuccess('Account created successfully! Redirecting to login...');
      
      // Save email to localStorage for convenience
      localStorage.setItem('lastSignupEmail', email);
      
      // Redirect to login after successful registration
      setTimeout(() => {
        router.push(`/auth/signin?message=Account created successfully&email=${encodeURIComponent(email)}`);
      }, 2000);
      
    } catch (error: any) {
      setError(error.message || 'An error occurred during registration');
      console.error('Registration error:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleShowPassword = () => {
    setShowPassword(!showPassword);
  };

  // Get password strength color
  const getPasswordStrengthColor = () => {
    switch (passwordStrength) {
      case 'weak': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'strong': return 'bg-green-500';
      case 'very-strong': return 'bg-[#b967ff]';
    }
  };
  
  // Get password strength label
  const getPasswordStrengthLabel = () => {
    switch (passwordStrength) {
      case 'weak': return 'Weak';
      case 'medium': return 'Medium';
      case 'strong': return 'Strong';
      case 'very-strong': return 'Very Strong';
    }
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        when: "beforeChildren",
        staggerChildren: 0.1
      }
    }
  };
  
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        type: "spring",
        stiffness: 100
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-2 sm:p-4 py-4 sm:py-6 overflow-auto">
      <AnimatedBackground />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md mx-auto overflow-hidden rounded-2xl bg-[#120a19] border border-[#b967ff]/20 shadow-lg backdrop-blur-sm my-2"
      >
        <div className="px-4 sm:px-8 pt-4 sm:pt-6 pb-3 sm:pb-4 border-b border-[#b967ff]/20">
          <motion.h2 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="text-xl sm:text-2xl font-bold text-center text-white"
          >
            Create an <span className="text-[#b967ff]">Account</span>
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="mt-1 text-center text-gray-300 text-sm sm:text-base"
          >
            Join our community today
          </motion.p>
        </div>
        
        <div className="px-4 sm:px-8 py-4 sm:py-6">
          <AnimatePresence>
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-3 sm:mb-4 p-3 rounded-lg flex items-start gap-2 bg-red-500/20 text-red-300 border border-red-500/30" 
                role="alert"
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
                <p className="text-xs sm:text-sm">{error}</p>
              </motion.div>
            )}
            
            {success && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-3 sm:mb-4 p-3 rounded-lg flex items-start gap-2 bg-green-500/20 text-green-300 border border-green-500/30"
                role="alert"
              >
                <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
                <p className="text-xs sm:text-sm">{success}</p>
              </motion.div>
            )}
          </AnimatePresence>
          
          <motion.form 
            onSubmit={handleSubmit} 
            className="space-y-3 sm:space-y-4"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <motion.div
              variants={itemVariants}
              className="bg-[#1A0D25] p-3 sm:p-4 rounded-lg hover:bg-[#1c0f29] transition-colors group"
            >
              <label htmlFor="name" className="block text-xs sm:text-sm font-medium text-gray-300 mb-1 sm:mb-2">
                Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <User className="w-4 h-4 sm:w-5 sm:h-5 text-[#b967ff]" />
                </div>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={() => handleBlur('name')}
                  className={`w-full pl-8 sm:pl-10 pr-3 py-2 sm:py-3 border rounded-lg focus:ring-2 bg-[#2D1D3A] border-[#b967ff]/30 group-hover:border-[#b967ff]/50 text-white focus:border-[#b967ff] focus:ring-[#b967ff]/50 transition-all text-sm ${
                    fieldTouched.name && !name ? 'border-red-500 focus:border-red-500 focus:ring-red-500/50' : ''
                  }`}
                  placeholder="John Doe"
                  required
                  aria-invalid={fieldTouched.name && !name ? 'true' : 'false'}
                />
              </div>
              <AnimatePresence>
                {fieldTouched.name && !name && (
                  <motion.p 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-1 text-xs text-red-400"
                    role="alert"
                  >
                    Full name is required
                  </motion.p>
                )}
              </AnimatePresence>
            </motion.div>
            
            <motion.div
              variants={itemVariants}
              className="bg-[#1A0D25] p-3 sm:p-4 rounded-lg hover:bg-[#1c0f29] transition-colors group"
            >
              <label htmlFor="email" className="block text-xs sm:text-sm font-medium text-gray-300 mb-1 sm:mb-2">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <Mail className="w-4 h-4 sm:w-5 sm:h-5 text-[#b967ff]" />
                </div>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => handleBlur('email')}
                  className={`w-full pl-8 sm:pl-10 pr-3 py-2 sm:py-3 border rounded-lg focus:ring-2 bg-[#2D1D3A] border-[#b967ff]/30 group-hover:border-[#b967ff]/50 text-white focus:border-[#b967ff] focus:ring-[#b967ff]/50 transition-all text-sm ${
                    fieldTouched.email && !emailValid ? 'border-red-500 focus:border-red-500 focus:ring-red-500/50' : ''
                  }`}
                  placeholder="your@email.com"
                  required
                  aria-invalid={fieldTouched.email && !emailValid ? 'true' : 'false'}
                  aria-describedby={fieldTouched.email && !emailValid ? 'email-error' : undefined}
                />
              </div>
              <AnimatePresence>
                {fieldTouched.email && !emailValid && (
                  <motion.p 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    id="email-error"
                    className="mt-1 text-xs text-red-400"
                    role="alert"
                  >
                    Please enter a valid email address
                  </motion.p>
                )}
              </AnimatePresence>
            </motion.div>
            
            <motion.div
              variants={itemVariants}
              className="bg-[#1A0D25] p-3 sm:p-4 rounded-lg hover:bg-[#1c0f29] transition-colors group"
            >
              <label htmlFor="password" className="block text-xs sm:text-sm font-medium text-gray-300 mb-1 sm:mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <Lock className="w-4 h-4 sm:w-5 sm:h-5 text-[#b967ff]" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={handlePasswordChange}
                  onBlur={() => handleBlur('password')}
                  className={`w-full pl-8 sm:pl-10 pr-10 py-2 sm:py-3 border rounded-lg focus:ring-2 bg-[#2D1D3A] border-[#b967ff]/30 group-hover:border-[#b967ff]/50 text-white focus:border-[#b967ff] focus:ring-[#b967ff]/50 transition-all text-sm ${
                    fieldTouched.password && password.length < 8 ? 'border-red-500 focus:border-red-500 focus:ring-red-500/50' : ''
                  }`}
                  placeholder="••••••••"
                  required
                  minLength={8}
                  aria-invalid={fieldTouched.password && password.length < 8 ? 'true' : 'false'}
                />
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  onClick={toggleShowPassword}
                  className="absolute inset-y-0 right-0 flex items-center pr-3"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 hover:text-[#b967ff]" aria-hidden="true" />
                  ) : (
                    <Eye className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 hover:text-[#b967ff]" aria-hidden="true" />
                  )}
                </motion.button>
              </div>
              
              <AnimatePresence>
                {fieldTouched.password && password.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-2"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs text-gray-300">
                        Password strength: <span className="font-medium">{getPasswordStrengthLabel()}</span>
                      </p>
                    </div>
                    <div className="w-full h-1 sm:h-1.5 bg-[#2D1D3A] rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ 
                          width: passwordStrength === 'weak' ? '25%' : 
                                 passwordStrength === 'medium' ? '50%' : 
                                 passwordStrength === 'strong' ? '75%' : '100%' 
                        }}
                        className={`h-full ${getPasswordStrengthColor()}`} 
                        transition={{ duration: 0.3 }}
                      ></motion.div>
                    </div>
                    <p className="mt-1 text-xs text-gray-400">
                      Use 8+ characters with a mix of letters, numbers & symbols
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
              
              <AnimatePresence>
                {fieldTouched.password && password.length > 0 && password.length < 8 && (
                  <motion.p 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-1 text-xs text-red-400"
                    role="alert"
                  >
                    Password must be at least 8 characters
                  </motion.p>
                )}
              </AnimatePresence>
            </motion.div>
            
            <motion.div
              variants={itemVariants}
              className="bg-[#1A0D25] p-3 sm:p-4 rounded-lg hover:bg-[#1c0f29] transition-colors group"
            >
              <label htmlFor="confirmPassword" className="block text-xs sm:text-sm font-medium text-gray-300 mb-1 sm:mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <Lock className="w-4 h-4 sm:w-5 sm:h-5 text-[#b967ff]" />
                </div>
                <input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onBlur={() => handleBlur('confirmPassword')}
                  className={`w-full pl-8 sm:pl-10 pr-3 py-2 sm:py-3 border rounded-lg focus:ring-2 bg-[#2D1D3A] border-[#b967ff]/30 group-hover:border-[#b967ff]/50 text-white focus:border-[#b967ff] focus:ring-[#b967ff]/50 transition-all text-sm ${
                    fieldTouched.confirmPassword && (confirmPassword !== password || !confirmPassword) 
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500/50' 
                      : ''
                  }`}
                  placeholder="••••••••"
                  required
                  aria-invalid={fieldTouched.confirmPassword && confirmPassword !== password ? 'true' : 'false'}
                />
              </div>
              <AnimatePresence>
                {fieldTouched.confirmPassword && confirmPassword !== password && (
                  <motion.p 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-1 text-xs text-red-400"
                    role="alert"
                  >
                    Passwords do not match
                  </motion.p>
                )}
              </AnimatePresence>
            </motion.div>
            
            <motion.button
              variants={itemVariants}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              type="submit"
              disabled={loading}
              className={`w-full py-2 sm:py-3 px-4 text-white font-medium rounded-lg flex justify-center items-center transition-all text-sm sm:text-base ${
                loading
                  ? 'bg-[#b967ff]/70 cursor-not-allowed' 
                  : 'bg-[#b967ff] hover:bg-[#a34de7] shadow-lg shadow-[#b967ff]/20'
              }`}
              aria-busy={loading}
            >
              {loading ? (
                <>
                  <div className="mr-2 h-3 w-3 sm:h-4 sm:w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 sm:w-5 sm:h-5 mr-2" aria-hidden="true" />
                  <span>Create Account</span>
                </>
              )}
            </motion.button>
            
            <motion.div 
              variants={itemVariants}
              className="text-center mt-3 sm:mt-4"
            >
              <p className="text-xs sm:text-sm text-gray-400">
                Already have an account?{" "}
                <Link href="/auth/signin" className="font-medium text-[#b967ff] hover:text-[#a34de7] hover:underline transition-colors inline-flex items-center">
                  Sign in <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 ml-1" />
                </Link>
              </p>
            </motion.div>
          </motion.form>
        </div>
      </motion.div>
    </div>
  );
}

// Main component with Suspense boundary
function SignUpForm() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-[#1A0D25] to-black">
        <div className="w-12 h-12 border-4 border-[#b967ff] border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <SignUpFormContent />
    </Suspense>
  );
}

export default SignUpForm;