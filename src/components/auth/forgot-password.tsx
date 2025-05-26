"use client"
import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Mail, Loader2, AlertCircle, CheckCircle, Lock, Eye, EyeOff, KeyRound, ShieldCheck } from 'lucide-react';
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

type Step = 'email' | 'code' | 'password';

function ForgotPasswordContent() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<Step>('email');
  
  // Form states
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<'weak' | 'medium' | 'strong' | 'very-strong'>('weak');
  const [fieldTouched, setFieldTouched] = useState({
    password: false,
    confirmPassword: false,
    code: false
  });
  
  // UI states
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [emailError, setEmailError] = useState('');
  const [codeError, setCodeError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  
  // Timer state
  const [codeSent, setCodeSent] = useState(false);
  const [timeLeft, setTimeLeft] = useState(3 * 60); // 3 minutes in seconds
  const [timerActive, setTimerActive] = useState(false);
  
  // Store reset token
  const [resetToken, setResetToken] = useState('');

  // Auto-dismiss success messages
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        if (currentStep !== 'password') {
          setSuccess('');
        }
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [success, currentStep]);

  // Timer effect
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    if (timerActive && timeLeft > 0) {
      intervalId = setInterval(() => {
        setTimeLeft((prevTime) => prevTime - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setTimerActive(false);
      // Optionally: update UI, e.g., enable resend button
      setCodeError('Verification code expired. Please send a new one.');
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [timerActive, timeLeft]);

  // Function to format time
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      setEmailError('Email is required');
      return false;
    }
    if (!emailRegex.test(email)) {
      setEmailError('Please enter a valid email address');
      return false;
    }
    setEmailError('');
    return true;
  };

  const validateCode = (code: string): boolean => {
    if (!code) {
      setCodeError('Verification code is required');
      return false;
    }
    if (code.length !== 6 || !/^\d+$/.test(code)) {
      setCodeError('Please enter a valid 6-digit code');
      return false;
    }
    setCodeError('');
    return true;
  };

  const validatePassword = (password: string, confirmPass: string): boolean => {
    if (!password) {
      setPasswordError('Password is required');
      return false;
    }
    if (password.length < 8) {
      setPasswordError('Password must be at least 8 characters long');
      return false;
    }
    if (password !== confirmPass) {
      setPasswordError('Passwords do not match');
      return false;
    }
    setPasswordError('');
    return true;
  };

  const handleSendCode = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validateEmail(email)) return;

    setIsLoading(true);
    setError('');
    setSuccess('');
    setCodeSent(false); // Reset before sending
    setTimerActive(false); // Stop previous timer if any
    setTimeLeft(3 * 60); // Reset timer

    try {
      const response = await fetch('/api/auth/send-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, type: 'password-reset' })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send verification code');
      }

      // Always show the generic success message:
        setSuccess('Verification code sent to your email. It will expire in 3 minutes.');
      
      setCodeSent(true);
      setTimerActive(true); // Start the timer
      setCurrentStep('code');
    } catch (err: any) {
      setError(err instanceof Error ? err.message : 'Failed to send verification code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validateCode(code)) return;
    if (timeLeft === 0) {
      setCodeError('Verification code has expired. Please send a new one.');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');
  
    try {
      const response = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email, 
          code,
          type: 'password-reset'
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Invalid verification code');
      }

      setResetToken(data.resetToken.token);
      setSuccess('Code verified successfully');
      setCurrentStep('password');
    } catch (err: any) {
      setError(err instanceof Error ? err.message : 'Failed to verify code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validatePassword(password, confirmPassword)) return;

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email,
          password,
          token: resetToken
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reset password');
      }

      setSuccess('Password reset successfully! Redirecting to login...');
      setTimeout(() => {
        router.push('/auth/signin');
      }, 2000);
    } catch (err: any) {
      setError(err instanceof Error ? err.message : 'Failed to reset password');
    } finally {
      setIsLoading(false);
    }
  };

  // Get step icon based on current step
  const getStepIcon = () => {
    switch (currentStep) {
      case 'email': return <Mail className="h-8 h-8 sm:h-10 sm:w-10 text-[#b967ff]" aria-hidden="true" />;
      case 'code': return <KeyRound className="h-8 h-8 sm:h-10 sm:w-10 text-[#b967ff]" aria-hidden="true" />;
      case 'password': return <ShieldCheck className="h-8 h-8 sm:h-10 sm:w-10 text-[#b967ff]" aria-hidden="true" />;
    }
  };

  // --- Add Password Strength Logic (Copied from signup-form) ---
  const checkPasswordStrength = (password: string) => {
    if (password.length < 8) return 'weak';
    let score = 0;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^a-zA-Z\d]/.test(password)) score++;
    if (password.length > 12) score++;
    if (score === 1) return 'medium';
    if (score === 2) return 'strong';
    if (score >= 3) return 'very-strong';
    return 'weak';
  };

  const getPasswordStrengthColor = () => {
    switch (passwordStrength) {
      case 'weak': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'strong': return 'bg-green-500';
      case 'very-strong': return 'bg-[#b967ff]';
    }
  };
  
  const getPasswordStrengthLabel = () => {
    switch (passwordStrength) {
      case 'weak': return 'Weak';
      case 'medium': return 'Medium';
      case 'strong': return 'Strong';
      case 'very-strong': return 'Very Strong';
    }
  };
  // --- End Password Strength Logic ---

  // Update handleBlur to track password field touch
  const handleBlur = (field: 'password' | 'confirmPassword') => {
    setFieldTouched(prev => ({ ...prev, [field]: true }));
    if (field === 'password') {
      setPasswordStrength(checkPasswordStrength(password));
    }
  };

  // Update handlePasswordChange to calculate strength
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPassword = e.target.value;
    setPassword(newPassword);
    if (fieldTouched.password) { // Check if already touched
      setPasswordStrength(checkPasswordStrength(newPassword));
    }
    // Also re-validate against confirm password if confirm has been touched
    if (fieldTouched.confirmPassword) {
        validatePassword(newPassword, confirmPassword);
    }
  };
  
  const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newConfirmPassword = e.target.value;
      setConfirmPassword(newConfirmPassword);
      validatePassword(password, newConfirmPassword); // Validate on change
  };

  const renderEmailStep = () => (
    <motion.form 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
      className="space-y-3 sm:space-y-5" 
      onSubmit={handleSendCode} 
      noValidate
    >
      <div>
        <label htmlFor="email" className="block mb-1 sm:mb-2 text-xs sm:text-sm font-medium text-gray-200">
          Email address
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Mail className="w-4 h-4 sm:w-5 sm:h-5 text-[#b967ff]" aria-hidden="true" />
          </div>
          <input
            id="email"
            name="email"
            type="email"
            required
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (e.target.value) validateEmail(e.target.value);
            }}
            className={`w-full pl-8 sm:pl-10 pr-3 py-2 sm:py-3 border rounded-lg focus:ring-2 bg-[#2D1D3A] border-[#b967ff]/30 text-white focus:border-[#b967ff] focus:ring-[#b967ff]/50 transition-all text-sm ${
              emailError ? 'border-red-500 focus:border-red-500 focus:ring-red-500/50' : ''
            }`}
            placeholder="name@example.com"
            aria-invalid={emailError ? 'true' : 'false'}
            aria-describedby={emailError ? 'email-error' : undefined}
          />
        </div>
        <AnimatePresence>
          {emailError && (
            <motion.p 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              id="email-error" 
              className="mt-1 text-xs text-red-400" 
              role="alert"
            >
              {emailError}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      <motion.button
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        type="submit"
        disabled={isLoading}
        className={`w-full py-2 sm:py-3 px-4 text-white font-medium rounded-lg flex justify-center items-center transition-all shadow-lg text-sm sm:text-base ${
          isLoading
            ? 'bg-[#b967ff]/70 cursor-not-allowed' 
            : 'bg-[#b967ff] hover:bg-[#a34de7] shadow-[#b967ff]/20'
        }`}
        aria-busy={isLoading}
      >
        {isLoading ? (
          <>
            <div className="mr-2 h-3 w-3 sm:h-4 sm:w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            Sending code...
          </>
        ) : (
          'Send verification code'
        )}
      </motion.button>
    </motion.form>
  );

  const renderCodeStep = () => (
    <motion.form 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
      className="space-y-3 sm:space-y-5" 
      onSubmit={handleVerifyCode} 
      noValidate
    >
      <div>
        <label htmlFor="code" className="block mb-1 sm:mb-2 text-xs sm:text-sm font-medium text-gray-200">
          Verification Code
        </label>
        <div className="relative bg-[#2D1D3A] rounded-lg border border-[#b967ff]/30 overflow-hidden shadow-inner">
          <input
            id="code"
            name="code"
            type="text"
            required
            maxLength={6}
            value={code}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, '').slice(0, 6);
              setCode(value);
              if (codeError || (fieldTouched.code && value)) validateCode(value);
            }}
            onBlur={() => {
              setFieldTouched(prev => ({ ...prev, code: true }));
              validateCode(code);
            }}
            className={`w-full px-4 py-2 sm:py-3 bg-transparent focus:ring-2 focus:outline-none text-white focus:ring-[#b967ff]/50 transition-all text-sm ${
              codeError ? 'border-red-500 focus:border-red-500 focus:ring-red-500/50' : 'focus:border-[#b967ff]'
            }`}
            placeholder="Enter 6-digit code"
            aria-invalid={codeError ? 'true' : 'false'}
            aria-describedby={codeError ? 'code-error timer-info' : 'timer-info'}
            disabled={timeLeft === 0}
          />
        </div>
        <div id="timer-info" className="mt-1 text-xs text-center">
          {codeSent && timerActive && (
            <p className="text-gray-400">
              Code expires in: <span className="font-medium text-gray-200">{formatTime(timeLeft)}</span>
            </p>
          )}
          {timeLeft === 0 && codeSent && (
            <p className="text-red-400">
              Code has expired. Please request a new one.
            </p>
          )}
          <AnimatePresence>
            {codeError && (
              <motion.p 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                id="code-error" 
                className="mt-1 text-red-400" 
                role="alert"
              >
                {codeError}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>
              
      <div className="flex flex-col space-y-2 sm:space-y-3">
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          type="submit"
          disabled={isLoading || timeLeft === 0}
          className={`w-full py-2 sm:py-3 px-4 text-white font-medium rounded-lg flex justify-center items-center transition-all shadow-lg text-sm sm:text-base ${
            isLoading || timeLeft === 0
              ? 'bg-gray-600/70 cursor-not-allowed text-gray-400'
              : 'bg-purple-700 hover:bg-purple-800 shadow-purple-700/20'
          }`}
          aria-busy={isLoading}
        >
          {isLoading && currentStep === 'code' ? (
            <>
              <div className="mr-2 h-3 w-3 sm:h-4 sm:w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Verifying...
            </>
          ) : (
            'Verify Code'
          )}
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          type="button"
          disabled={isLoading || timerActive}
          onClick={(e) => {
             setIsLoading(true);
             handleSendCode(e as any).finally(() => setIsLoading(false));
           }}
          className={`w-full py-2 sm:py-3 px-4 font-medium rounded-lg flex justify-center items-center transition-all shadow-lg text-sm sm:text-base ${
            isLoading || timerActive
              ? 'bg-gray-700/50 text-gray-400 cursor-not-allowed'
              : 'bg-transparent border border-purple-700/50 text-purple-300 hover:bg-purple-700/20 hover:text-purple-200'
          }`}
          aria-busy={isLoading}
        >
          {isLoading && !timerActive ? (
            <>
              <div className="mr-2 h-3 w-3 sm:h-4 sm:w-4 border-2 border-purple-300 border-t-transparent rounded-full animate-spin"></div>
              Sending...
            </>
          ) : (
            'Resend Code'
          )}
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          type="button"
          disabled={isLoading}
          onClick={() => {
             setCode('');
             setCodeError('');
             setCodeSent(false);
             setTimerActive(false);
             setTimeLeft(3 * 60);
             setError('');
             setSuccess('');
             setCurrentStep('email');
          }}
          className="text-xs sm:text-sm text-[#b967ff] hover:text-[#a34de7] disabled:text-gray-500 transition-colors py-2 flex items-center justify-center"
        >
          <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4 mr-1" /> Change email address
        </motion.button>
      </div>
    </motion.form>
  );

  const renderPasswordStep = () => (
    <motion.form 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
      className="space-y-3 sm:space-y-5" 
      onSubmit={handleResetPassword} 
      noValidate
    >
      <div>
        <label htmlFor="password" className="block mb-1 sm:mb-2 text-xs sm:text-sm font-medium text-gray-200">
          New Password
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Lock className="w-4 h-4 sm:w-5 sm:h-5 text-[#b967ff]" aria-hidden="true" />
          </div>
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            required
            value={password}
            onChange={handlePasswordChange}
            onBlur={() => handleBlur('password')}
            className={`w-full pl-8 sm:pl-10 pr-10 py-2 sm:py-3 border rounded-lg focus:ring-2 bg-[#2D1D3A] border-[#b967ff]/30 text-white focus:border-[#b967ff] focus:ring-[#b967ff]/50 transition-all text-sm ${
              passwordError && (passwordError === 'Password is required' || passwordError === 'Password must be at least 8 characters long') ? 'border-red-500 focus:border-red-500 focus:ring-red-500/50' : ''
            }`}
            placeholder="Enter new password"
            aria-invalid={passwordError ? 'true' : 'false'}
          />
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            type="button"
            onClick={() => setShowPassword(!showPassword)}
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
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {passwordError && passwordError === 'Password must be at least 8 characters long' && (
            <motion.p 
               initial={{ opacity: 0, height: 0 }}
               animate={{ opacity: 1, height: 'auto' }}
               exit={{ opacity: 0, height: 0 }}
               className="mt-1 text-xs text-red-400" 
               role="alert"
            >
              {passwordError}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      <div>
        <label htmlFor="confirmPassword" className="block mb-1 sm:mb-2 text-xs sm:text-sm font-medium text-gray-200">
          Confirm Password
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Lock className="w-4 h-4 sm:w-5 sm:h-5 text-[#b967ff]" aria-hidden="true" />
          </div>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type={showPassword ? "text" : "password"}
            required
            value={confirmPassword}
            onChange={handleConfirmPasswordChange}
            onBlur={() => handleBlur('confirmPassword')}
            className={`w-full pl-8 sm:pl-10 pr-3 py-2 sm:py-3 border rounded-lg focus:ring-2 bg-[#2D1D3A] border-[#b967ff]/30 text-white focus:border-[#b967ff] focus:ring-[#b967ff]/50 transition-all text-sm ${
              passwordError && passwordError === 'Passwords do not match' ? 'border-red-500 focus:border-red-500 focus:ring-red-500/50' : ''
            }`}
            placeholder="Confirm new password"
            aria-invalid={passwordError && passwordError === 'Passwords do not match' ? 'true' : 'false'}
          />
        </div>
        <AnimatePresence>
          {passwordError && passwordError === 'Passwords do not match' && (
            <motion.p 
               initial={{ opacity: 0, height: 0 }}
               animate={{ opacity: 1, height: 'auto' }}
               exit={{ opacity: 0, height: 0 }}
               className="mt-1 text-xs text-red-400" 
               role="alert"
            >
              {passwordError}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      <motion.button
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        type="submit"
        disabled={isLoading}
        className={`w-full py-2 sm:py-3 px-4 text-white font-medium rounded-lg flex justify-center items-center transition-all shadow-lg text-sm sm:text-base ${
          isLoading
            ? 'bg-[#b967ff]/70 cursor-not-allowed' 
            : 'bg-[#b967ff] hover:bg-[#a34de7] shadow-[#b967ff]/20'
        }`}
        aria-busy={isLoading}
      >
        {isLoading ? (
          <>
            <div className="mr-2 h-3 w-3 sm:h-4 sm:w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            Resetting password...
          </>
        ) : (
          'Reset Password'
        )}
      </motion.button>
    </motion.form>
  );

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
          <motion.div
            whileHover={{ x: -3 }}
            className="inline-block"
          >
            <Link
              href="/auth/signin"
              className="inline-flex items-center text-xs sm:text-sm text-gray-300 hover:text-[#b967ff] transition-colors duration-200"
              aria-label="Back to login"
            >
              <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" aria-hidden="true" />
              Back to login
            </Link>
          </motion.div>
          
          <div className="mt-4 sm:mt-6 flex flex-col items-center">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 15 }}
              className="p-2 sm:p-3 bg-[#b967ff]/10 rounded-full mb-3 sm:mb-4"
            >
              {getStepIcon()}
            </motion.div>
            
            <motion.h2
              key={currentStep}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.4 }}
              className="text-xl sm:text-2xl font-bold text-center text-white"
            >
              {currentStep === 'email' && 'Forgot your password?'}
              {currentStep === 'code' && 'Check your email'}
              {currentStep === 'password' && 'Create new password'}
            </motion.h2>
            
            <motion.p
              key={`${currentStep}-desc`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.4 }}
              className="mt-1 sm:mt-2 text-center text-gray-300 text-xs sm:text-sm px-2"
            >
              {currentStep === 'email' && "Enter your email and we'll send you a verification code"}
              {currentStep === 'code' && "Enter the 6-digit code we sent to your email"}
              {currentStep === 'password' && "Choose a strong password for your account"}
            </motion.p>
          </div>
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

          <AnimatePresence mode="wait">
            {currentStep === 'email' && renderEmailStep()}
            {currentStep === 'code' && renderCodeStep()}
            {currentStep === 'password' && renderPasswordStep()}
          </AnimatePresence>
        </div>
      </motion.div>
      
      {/* Step indicator */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="mt-4 sm:mt-8 flex justify-center space-x-2"
      >
        {['email', 'code', 'password'].map((step, i) => (
          <motion.div 
            key={step}
            className={`h-1.5 sm:h-2 rounded-full ${step === currentStep ? 'w-6 sm:w-8 bg-[#b967ff]' : 'w-1.5 sm:w-2 bg-gray-600'}`}
            animate={{ width: step === currentStep ? 24 : 6 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          />
        ))}
      </motion.div>
    </div>
  );
}

// Main component with Suspense boundary
function ForgotPasswordForm() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-[#1A0D25] to-black">
        <div className="w-8 h-8 sm:w-12 sm:h-12 border-4 border-[#b967ff] border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <ForgotPasswordContent />
    </Suspense>
  );
}

export default ForgotPasswordForm;
