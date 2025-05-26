"use client"
import React, { FormEvent, useState, useEffect, Suspense } from 'react';
import { LogIn, Mail, Lock, AlertCircle, Loader2, CheckCircle, Eye, EyeOff, UserPlus, Github } from 'lucide-react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
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

// Component that uses useSearchParams
function LoginFormContent() {
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isGithubLoading, setIsGithubLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [rememberedEmail, setRememberedEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [attempts, setAttempts] = useState(0);
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/';
  const initialEmail = searchParams.get('email') || '';
  
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password: string) => {
    return password.length >= 8;
  };

  useEffect(() => {
    // Check for success message from signup
    const message = searchParams.get('message');
    if (message) {
      setSuccess(message);
      
      // Auto-dismiss success message after 5 seconds
      const timer = setTimeout(() => {
        setSuccess('');
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  useEffect(() => {
    const queryEmail = searchParams.get('email');
    if (queryEmail && queryEmail !== rememberedEmail) {
      setRememberedEmail(queryEmail);
    }
    // Only run if queryEmail changes, not rememberedEmail
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const email = e.target.value;
    setRememberedEmail(email);
    if (email && !validateEmail(email)) {
      setEmailError('Please enter a valid email address');
    } else {
      setEmailError('');
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPassword = e.target.value;
    setPassword(newPassword);
    if (newPassword && !validatePassword(newPassword)) {
      setPasswordError('Password must be at least 8 characters long');
    } else {
      setPasswordError('');
    }
  };

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    
    if (!validateEmail(rememberedEmail)) {
      setEmailError('Please enter a valid email address');
      return;
    }

    if (!validatePassword(password)) {
      setPasswordError('Password must be at least 8 characters long');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');
    setEmailError('');
    setPasswordError('');

    try {
      const result = await signIn('credentials', {
        redirect: false,
        email: rememberedEmail.toLowerCase(),
        password,
        callbackUrl,
      });

      if (result?.error) {
        // Check specifically for account suspension
        if (result.error === "AccountSuspended") {
          router.push('/account-suspended');
          return;
        }
        // Check for server-side rate limiting
        if (result.error === "TooManyAttempts") {
          setError("You've made too many unsuccessful login attempts. Please try again in 15 minutes.");
          // Optionally, disable the form for a period or provide more specific feedback
          return;
        }

        // Fallback for other credential errors
        setError('Invalid credentials. Please check your email and password.');
        return;
      }

      if (result?.url) {
        setSuccess('Sign in successful! Redirecting...');
        
        setTimeout(() => {
          router.push(result.url);
          router.refresh();
        }, 1000);
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  const handleGoogleSignIn = async () => {
    try {
      setIsGoogleLoading(true);
      setError('');
      await signIn('google', {
        callbackUrl,
        prompt: "select_account"
      });
    } catch (err) {
      setError('Failed to sign in with Google');
      setIsGoogleLoading(false);
    }
  };

  const handleGithubSignIn = async () => {
    try {
      setIsGithubLoading(true);
      setError('');
      await signIn('github', {
        callbackUrl,
      });
    } catch (err) {
      setError('Failed to sign in with GitHub');
      setIsGithubLoading(false);
    }
  };

  const toggleShowPassword = () => {
    setShowPassword(!showPassword);
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
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <AnimatedBackground />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md mx-auto overflow-hidden rounded-2xl bg-[#120a19] border border-[#b967ff]/20 shadow-lg backdrop-blur-sm"
      >
        <div className="px-8 pt-8 pb-6 border-b border-[#b967ff]/20">
          <motion.h2 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="text-2xl font-bold text-center text-white"
          >
            Welcome <span className="text-[#b967ff]">Back</span>
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="mt-2 text-center text-gray-300"
          >
            Sign in to your account
          </motion.p>
        </div>
        
        <div className="px-8 py-6">
          <AnimatePresence>
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-6 p-4 rounded-lg flex items-start gap-3 bg-red-500/20 text-red-300 border border-red-500/30" 
                role="alert"
              >
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" aria-hidden="true" />
                <p className="text-sm">{error}</p>
              </motion.div>
            )}
            
            {success && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-6 p-4 rounded-lg flex items-start gap-3 bg-green-500/20 text-green-300 border border-green-500/30" 
                role="alert"
              >
                <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" aria-hidden="true" />
                <p className="text-sm">{success}</p>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.form 
            onSubmit={handleSubmit} 
            className="space-y-5" 
            noValidate
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <motion.div
              variants={itemVariants}
              className="bg-[#1A0D25] p-5 rounded-lg hover:bg-[#1c0f29] transition-colors group"
            >
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <Mail className="w-5 h-5 text-[#b967ff]" aria-hidden="true" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={rememberedEmail}
                  onChange={handleEmailChange}
                  className={`w-full pl-10 pr-3 py-3 border rounded-lg focus:ring-2 bg-[#2D1D3A] border-[#b967ff]/30 group-hover:border-[#b967ff]/50 text-white focus:border-[#b967ff] focus:ring-[#b967ff]/50 transition-all ${
                    emailError ? 'border-red-500 focus:border-red-500 focus:ring-red-500/50' : ''
                  }`}
                  placeholder="your@email.com"
                  required
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
                    className="mt-1 text-sm text-red-400" 
                    role="alert"
                  >
                    {emailError}
                  </motion.p>
                )}
              </AnimatePresence>
            </motion.div>
            
            <motion.div
              variants={itemVariants}
              className="bg-[#1A0D25] p-5 rounded-lg hover:bg-[#1c0f29] transition-colors group"
            >
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <Lock className="w-5 h-5 text-[#b967ff]" aria-hidden="true" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={handlePasswordChange}
                  className={`w-full pl-10 pr-12 py-3 border rounded-lg focus:ring-2 bg-[#2D1D3A] border-[#b967ff]/30 group-hover:border-[#b967ff]/50 text-white focus:border-[#b967ff] focus:ring-[#b967ff]/50 transition-all ${
                    passwordError ? 'border-red-500 focus:border-red-500 focus:ring-red-500/50' : ''
                  }`}
                  placeholder="••••••••"
                  required
                  aria-invalid={passwordError ? 'true' : 'false'}
                  aria-describedby={passwordError ? 'password-error' : undefined}
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
                    <EyeOff className="w-5 h-5 text-gray-400 hover:text-[#b967ff]" aria-hidden="true" />
                  ) : (
                    <Eye className="w-5 h-5 text-gray-400 hover:text-[#b967ff]" aria-hidden="true" />
                  )}
                </motion.button>
              </div>
              <AnimatePresence>
                {passwordError && (
                  <motion.p 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    id="password-error" 
                    className="mt-1 text-sm text-red-400" 
                    role="alert"
                  >
                    {passwordError}
                  </motion.p>
                )}
              </AnimatePresence>
            </motion.div>
            
            <motion.div 
              variants={itemVariants}
              className="flex items-center justify-between px-2"
            >
              <div className="flex-1"></div>
              <Link 
                href="/auth/forgot-password"
                className="text-sm font-medium text-[#b967ff] hover:text-[#a34de7] transition-colors hover:underline"
              >
                Forgot password?
              </Link>
            </motion.div>
            
            <motion.button
              variants={itemVariants}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              type="submit"
              disabled={isLoading || attempts >= 3}
              className={`w-full py-3 px-4 text-white font-medium rounded-lg flex justify-center items-center transition-all ${
                isLoading || attempts >= 3
                  ? 'bg-[#b967ff]/70 cursor-not-allowed' 
                  : 'bg-[#b967ff] hover:bg-[#a34de7] shadow-lg shadow-[#b967ff]/20'
              }`}
              aria-busy={isLoading}
            >
              {isLoading ? (
                <>
                  <div className="mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5 mr-2" aria-hidden="true" />
                  <span>Sign in</span>
                </>
              )}
            </motion.button>
            
            <div className="flex items-center my-4 before:flex-1 before:border-t after:flex-1 after:border-t before:border-[#b967ff]/20 after:border-[#b967ff]/20 text-gray-400">
              <p className="text-center font-medium mx-4 mb-0">OR</p>
            </div>
            
            <motion.button
              variants={itemVariants}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isGoogleLoading}
              className="w-full py-3 px-4 font-medium rounded-lg flex justify-center items-center border border-[#b967ff]/30 bg-[#1A0D25] text-white hover:bg-[#1c0f29] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              aria-busy={isGoogleLoading}
            >
              {isGoogleLoading ? (
                <div className="mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
              )}
              <span>{isGoogleLoading ? 'Signing in...' : 'Sign in with Google'}</span>
            </motion.button>
            
            <motion.button
              variants={itemVariants}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              type="button"
              onClick={handleGithubSignIn}
              disabled={isGithubLoading}
              className="w-full py-3 px-4 font-medium rounded-lg flex justify-center items-center border border-[#b967ff]/30 bg-[#1A0D25] text-white hover:bg-[#1c0f29] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              aria-busy={isGithubLoading}
            >
              {isGithubLoading ? (
                <div className="mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Github className="w-5 h-5 mr-2" aria-hidden="true" />
              )}
              <span>{isGithubLoading ? 'Signing in...' : 'Sign in with GitHub'}</span>
            </motion.button>
            
            <motion.div 
              variants={itemVariants}
              className="text-center mt-6"
            >
              <p className="text-sm text-gray-400">
                Don&apos;t have an account?{" "}
                <Link href="/auth/signup" className="font-medium text-[#b967ff] hover:text-[#a34de7] hover:underline transition-colors inline-flex items-center">
                  Sign up <UserPlus className="w-4 h-4 ml-1" />
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
function LoginForm() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-[#1A0D25] to-black">
        <div className="w-12 h-12 border-4 border-[#b967ff] border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <LoginFormContent />
    </Suspense>
  );
}

export default LoginForm;